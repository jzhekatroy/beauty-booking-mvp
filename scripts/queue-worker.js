/*
  Telegram Notification Queue Worker
  - Processes NotificationQueue tasks (SEND_MESSAGE, RESEND_MESSAGE)
  - Respects GlobalNotificationSettings (rate limit, retries, backoff)
  - Writes results to NotificationLog
*/

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

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
  const resp = await fetch(`https://api.telegram.org/bot${teamBotToken}/sendMessage`, {
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

  const { ok, body } = await sendTelegramMessageViaBot(
    client.team.telegramBotToken,
    client.telegramId,
    message
  );

  await prisma.notificationLog.create({
    data: {
      type: 'queue_send',
      teamId: client.teamId,
      clientId: client.id,
      message,
      status: ok ? 'SUCCESS' : 'FAILED',
      telegramMessageId: ok ? String(body?.result?.message_id || '') : null,
      errorMessage: ok ? null : JSON.stringify(body),
      attempts: task.attempts + 1,
      userAgent: meta?.userAgent || 'queue-worker',
      ipAddress: meta?.ipAddress || null,
    },
  });

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


