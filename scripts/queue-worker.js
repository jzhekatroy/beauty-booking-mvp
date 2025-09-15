/*
  Telegram Notification Queue Worker
  - Processes NotificationQueue tasks (SEND_MESSAGE, RESEND_MESSAGE)
  - Respects GlobalNotificationSettings (rate limit, retries, backoff)
  - Writes results to NotificationLog
*/

const { PrismaClient } = require('@prisma/client');
// Используем встроенный fetch из Node 18+
const fetchFn = globalThis.fetch;

const prisma = new PrismaClient();

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getLimits() {
  const g = await prisma.globalNotificationSettings.findFirst();
  return {
    maxRequestsPerMinute: g?.maxRequestsPerMinute ?? 25,
    requestDelayMs: g?.requestDelayMs ?? 2000,
    maxRetryAttempts: g?.maxRetryAttempts ?? 3,
    retryDelayMs: g?.retryDelayMs ?? 5000,
    exponentialBackoff: g?.exponentialBackoff ?? true,
  };
}

async function tryLockOne() {
  const task = await prisma.notificationQueue.findFirst({
    where: { status: 'PENDING', executeAt: { lte: new Date() } },
    orderBy: [{ executeAt: 'asc' }, { createdAt: 'asc' }],
  });
  if (!task) return null;
  const locked = await prisma.notificationQueue.updateMany({
    where: { id: task.id, status: 'PENDING' },
    data: { status: 'PROCESSING' },
  });
  return locked.count === 1 ? task : null;
}

async function sendTelegramMessageViaBot(teamBotToken, chatId, text) {
  const resp = await fetchFn(`https://api.telegram.org/bot${teamBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'HTML' }),
    timeout: 20000,
  });
  const body = await resp.json().catch(() => ({}));
  const ok = resp.ok && body?.ok !== false;
  return { ok, body };
}

async function handleSendMessage(task) {
  const data = task.data || {};
  const { teamId, clientId, message, meta } = data;
  if (!teamId || !clientId || !message) throw new Error('Bad task payload');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { team: true },
  });
  if (!client) throw new Error('Client not found');
  if (!client.telegramId) throw new Error('Client telegramId missing');
  if (!client.team?.telegramBotToken) throw new Error('Team bot token missing');

  // Templating of variables
  const first = (client.firstName || client.telegramFirstName || '').trim();
  const last = (client.lastName || client.telegramLastName || '').trim();
  const username = client.telegramUsername ? `@${client.telegramUsername}` : '';
  const clientName = (first || last) ? `${first} ${last}`.trim() : (username || 'клиент');
  const teamName = client.team?.name || 'Салон';
  let finalText = String(message);
  const replacements = {
    '{client_name}': clientName,
    '{client_first_name}': first || clientName,
    '{client_last_name}': last || '',
    '{team_name}': teamName,
  };
  for (const [key, val] of Object.entries(replacements)) finalText = finalText.split(key).join(val);

  const { ok, body } = await sendTelegramMessageViaBot(
    client.team.telegramBotToken,
    client.telegramId,
    finalText
  );

  await prisma.notificationLog.create({
    data: {
      type: meta?.source === 'broadcast' ? 'broadcast_send' : 'queue_send',
      teamId: client.teamId,
      clientId: client.id,
      message: finalText,
      status: ok ? 'SUCCESS' : 'FAILED',
      telegramMessageId: ok ? String(body?.result?.message_id || '') : null,
      errorMessage: ok ? null : JSON.stringify(body),
      attempts: task.attempts + 1,
      userAgent: meta?.userAgent || 'worker',
      ipAddress: meta?.ipAddress || null,
      campaignId: meta?.campaignId || null,
    },
  });

  // Update campaign progress if present
  if (meta?.campaignId) {
    await prisma.broadcastCampaign.update({
      where: { id: meta.campaignId },
      data: ok
        ? { progressSent: { increment: 1 } }
        : { progressFailed: { increment: 1 } },
    }).catch(() => {});
  }

  return ok;
}

async function handleSendPhoto(task) {
  const data = task.data || {};
  const { teamId, clientId, photoUrl, caption, meta } = data;
  if (!teamId || !clientId || !photoUrl) throw new Error('Bad photo task payload');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { team: true },
  });
  if (!client) throw new Error('Client not found');
  if (!client.telegramId) throw new Error('Client telegramId missing');
  if (!client.team?.telegramBotToken) throw new Error('Team bot token missing');

  // Templating for caption
  const first = (client.firstName || client.telegramFirstName || '').trim();
  const last = (client.lastName || client.telegramLastName || '').trim();
  const username = client.telegramUsername ? `@${client.telegramUsername}` : '';
  const clientName = (first || last) ? `${first} ${last}`.trim() : (username || 'клиент');
  const teamName = client.team?.name || 'Салон';
  let finalCaption = String(caption || '');
  const replacements = {
    '{client_name}': clientName,
    '{client_first_name}': first || clientName,
    '{client_last_name}': last || '',
    '{team_name}': teamName,
  };
  for (const [k, v] of Object.entries(replacements)) finalCaption = finalCaption.split(k).join(v);

  // Send photo
  const resp = await fetchFn(`https://api.telegram.org/bot${client.team.telegramBotToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: String(client.telegramId), photo: photoUrl, caption: finalCaption, parse_mode: 'HTML' }),
    timeout: 20000,
  });
  const body = await resp.json().catch(() => ({}));
  const ok = resp.ok && body?.ok !== false;

  await prisma.notificationLog.create({
    data: {
      type: meta?.source === 'broadcast' ? 'broadcast_send' : 'queue_send',
      teamId: client.teamId,
      clientId: client.id,
      message: finalCaption || '[photo]',
      status: ok ? 'SUCCESS' : 'FAILED',
      telegramMessageId: ok ? String(body?.result?.message_id || '') : null,
      errorMessage: ok ? null : JSON.stringify(body),
      attempts: task.attempts + 1,
      userAgent: meta?.userAgent || 'worker',
      ipAddress: meta?.ipAddress || null,
      campaignId: meta?.campaignId || null,
    },
  });

  if (meta?.campaignId) {
    await prisma.broadcastCampaign.update({
      where: { id: meta.campaignId },
      data: ok ? { progressSent: { increment: 1 } } : { progressFailed: { increment: 1 } },
    }).catch(() => {});
  }

  return ok;
}

async function handleResendMessage(task) {
  const data = task.data || {};
  const { logId } = data;
  if (!logId) throw new Error('logId required');
  const log = await prisma.notificationLog.findUnique({
    where: { id: logId },
    include: {
      client: { select: { telegramId: true, teamId: true } },
      team: { select: { telegramBotToken: true, id: true } },
    },
  });
  if (!log) throw new Error('Source log not found');
  if (!log.client?.telegramId) throw new Error('Client telegramId missing');
  if (!log.team?.telegramBotToken) throw new Error('Team bot token missing');

  const { ok, body } = await sendTelegramMessageViaBot(
    log.team.telegramBotToken,
    log.client.telegramId,
    log.message
  );

  await prisma.notificationLog.create({
    data: {
      type: 'manual_resend',
      teamId: log.teamId,
      clientId: log.clientId,
      message: log.message,
      status: ok ? 'SUCCESS' : 'FAILED',
      telegramMessageId: ok ? String(body?.result?.message_id || '') : null,
      errorMessage: ok ? null : JSON.stringify(body),
      attempts: 1,
      userAgent: 'queue-worker',
      ipAddress: null,
    },
  });

  return ok;
}

function nextExecuteAt(baseMs, attempts, exp) {
  const factor = exp ? Math.pow(2, Math.max(0, attempts - 1)) : 1;
  const delay = Math.min(baseMs * factor, 10 * 60 * 1000); // max 10m
  return new Date(Date.now() + delay);
}

async function processOnce() {
  const task = await tryLockOne();
  if (!task) return { processed: false };

  let ok = false;
  try {
    if (task.type === 'SEND_MESSAGE') ok = await handleSendMessage(task);
    else if (task.type === 'SEND_PHOTO') ok = await handleSendPhoto(task);
    else if (task.type === 'RESEND_MESSAGE') ok = await handleResendMessage(task);
    else throw new Error(`Unknown task type: ${task.type}`);
  } catch (e) {
    console.error('[queue-worker] task error', task.id, e?.message || e);
    ok = false;
  }

  if (ok) {
    await prisma.notificationQueue.update({ where: { id: task.id }, data: { status: 'COMPLETED' } });
  } else {
    const limits = await getLimits();
    const attempts = task.attempts + 1;
    if (attempts < (limits.maxRetryAttempts ?? 3)) {
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: {
          status: 'PENDING',
          attempts,
          executeAt: nextExecuteAt(limits.retryDelayMs ?? 5000, attempts, limits.exponentialBackoff ?? true),
          errorMessage: 'Retry scheduled',
        },
      });
    } else {
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: { status: 'FAILED', attempts, errorMessage: 'Max attempts reached' },
      });
    }
  }

  return { processed: true };
}

async function main() {
  console.log('[queue-worker] starting...');
  const limits = await getLimits();
  const minDelay = Math.max(250, limits.requestDelayMs);
  console.log('[queue-worker] limits', limits, 'minDelay', minDelay);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { processed } = await processOnce();
      await sleep(processed ? minDelay : 1000);
    } catch (e) {
      console.error('[queue-worker] loop error', e?.message || e);
      await sleep(2000);
    }
  }
}

process.on('SIGTERM', async () => {
  console.log('[queue-worker] SIGTERM');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[queue-worker] SIGINT');
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (e) => {
  console.error('[queue-worker] fatal', e);
  await prisma.$disconnect();
  process.exit(1);
});


