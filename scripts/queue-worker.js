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

function toAbsoluteUrl(urlOrPath) {
  try {
    if (!urlOrPath) return urlOrPath;
    if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
    const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const path = String(urlOrPath).startsWith('/') ? urlOrPath : `/${urlOrPath}`;
    return `${base}${path}`;
  } catch {
    return urlOrPath;
  }
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDateTimeParts(date, timeZone) {
  try {
    const d = new Date(date);
    const fmt = new Intl.DateTimeFormat('ru-RU', {
      timeZone: timeZone || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
    const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
    const booking_date = `${parts.day}.${parts.month}.${parts.year}`;
    const booking_time = `${parts.hour}:${parts.minute}`;
    return { booking_date, booking_time };
  } catch {
    const dd = pad2(new Date(date).getUTCDate());
    const mm = pad2(new Date(date).getUTCMonth() + 1);
    const yy = new Date(date).getUTCFullYear();
    const hh = pad2(new Date(date).getUTCHours());
    const mi = pad2(new Date(date).getUTCMinutes());
    return { booking_date: `${dd}.${mm}.${yy}`, booking_time: `${hh}:${mi}` };
  }
}

function buildReplacements(client, team, meta) {
  const first = (client.firstName || client.telegramFirstName || '').trim();
  const last = (client.lastName || client.telegramLastName || '').trim();
  const username = client.telegramUsername ? `@${client.telegramUsername}` : '';
  const clientName = (first || last) ? `${first} ${last}`.trim() : (username || 'клиент');
  const teamName = team?.name || 'Салон';

  const booking = meta?.booking || {};
  const { startTime, serviceName, serviceNames, masterName, serviceDurationMin } = booking;
  const { booking_date, booking_time } = startTime ? formatDateTimeParts(startTime, team?.timezone) : { booking_date: '', booking_time: '' };
  const namesJoined = Array.isArray(serviceNames) ? serviceNames.filter(Boolean).join(', ') : '';
  const singleName = (serviceName || namesJoined || (Array.isArray(serviceNames) ? serviceNames[0] : '') || '').trim();
  const durationMin = Number.isFinite(Number(serviceDurationMin)) ? String(Number(serviceDurationMin)) : '';

  return {
    '{client_name}': clientName,
    '{client_first_name}': first || clientName,
    '{client_last_name}': last || '',
    '{team_name}': teamName,
    '{booking_date}': booking_date,
    '{booking_time}': booking_time,
    '{service_name}': singleName,
    '{service_names}': namesJoined || singleName,
    '{service_duration_min}': durationMin,
    '{master_name}': masterName || '',
  };
}

async function getGlobalLimits() {
  const g = await prisma.globalNotificationSettings.findFirst();
  return {
    maxRequestsPerMinute: g?.maxRequestsPerMinute ?? 25,
    requestDelayMs: g?.requestDelayMs ?? 2000,
    maxRetryAttempts: g?.maxRetryAttempts ?? 3,
    retryDelayMs: g?.retryDelayMs ?? 5000,
    exponentialBackoff: g?.exponentialBackoff ?? true,
  };
}

async function getTeamLimits(teamId) {
  try {
    const p = await prisma.teamNotificationPolicy.findUnique({ where: { teamId } });
    return {
      telegramRatePerMinute: p?.telegramRatePerMinute ?? 25,
      telegramPerChatPerMinute: p?.telegramPerChatPerMinute ?? 15,
      maxConcurrentSends: p?.maxConcurrentSends ?? 1,
    };
  } catch {
    return { telegramRatePerMinute: 25, telegramPerChatPerMinute: 15, maxConcurrentSends: 1 };
  }
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

// простая реализация квоты: ведём окна по минутам per team и per chat в памяти
const teamWindow = new Map(); // teamId -> { windowStart: ms, count: number }
const chatWindow = new Map(); // chatId -> { windowStart: ms, count: number }

function allowWithinWindow(key, limit) {
  const now = Date.now();
  const winStart = now - 60 * 1000;
  const entry = (key.startsWith('team:') ? teamWindow : chatWindow).get(key);
  if (!entry || entry.windowStart < winStart) {
    (key.startsWith('team:') ? teamWindow : chatWindow).set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count < limit) {
    entry.count += 1;
    return true;
  }
  return false;
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

  // Rate limit per team/per chat (minute window)
  const teamLimits = await getTeamLimits(client.teamId);
  const teamKey = `team:${client.teamId}`;
  const chatKey = `chat:${String(client.telegramId)}`;
  if (!allowWithinWindow(teamKey, teamLimits.telegramRatePerMinute) || !allowWithinWindow(chatKey, teamLimits.telegramPerChatPerMinute)) {
    // отложим задачу на следующую секунду, чтобы не терять темп
    await prisma.notificationQueue.update({
      where: { id: task.id },
      data: { status: 'PENDING', executeAt: new Date(Date.now() + 1000), errorMessage: 'Rate limited, rescheduled' },
    });
    return true; // считаем обработанной (перепланирована)
  }

  // Templating of variables
  let finalText = String(message);
  const replacements = buildReplacements(client, client.team, meta);
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
  let finalCaption = String(caption || '');
  const replacements = buildReplacements(client, client.team, meta);
  for (const [k, v] of Object.entries(replacements)) finalCaption = finalCaption.split(k).join(v);

  // Send photo
  const photo = toAbsoluteUrl(photoUrl);
  const resp = await fetchFn(`https://api.telegram.org/bot${client.team.telegramBotToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: String(client.telegramId), photo, caption: finalCaption, parse_mode: 'HTML' }),
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
    const limits = await getGlobalLimits();
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
  const limits = await getGlobalLimits();
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


