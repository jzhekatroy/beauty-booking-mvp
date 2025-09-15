# Используем официальный Node.js образ
FROM node:18-alpine AS base

# Устанавливаем зависимости только при необходимости
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json* ./
# Нужны dev-зависимости для сборки (tailwind/postcss и т.п.)
RUN npm ci

# Пересобираем исходный код только при необходимости
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Собираем приложение
RUN npm run build

# Образ для продакшена
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем пользователя nextjs
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем необходимые файлы
COPY --from=builder /app/public ./public

# Устанавливаем правильные права доступа для prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Копируем собранное приложение
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копируем Prisma файлы
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Копируем скрипты (воркер очереди)
COPY --from=builder --chown=nextjs:nodejs /app/scripts/queue-worker.js ./scripts/queue-worker.js

# Создаем директорию для базы данных
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Запускаем приложение
CMD ["node", "server.js"]

# На всякий случай: гарантируем отсутствие случайно попавшего .env внутри образа
RUN rm -f .env 2>/dev/null || true