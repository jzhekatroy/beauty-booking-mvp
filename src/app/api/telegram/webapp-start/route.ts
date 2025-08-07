import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Функция для проверки данных Telegram WebApp
async function validateTelegramWebAppData(initData: string, teamSlug: string): Promise<boolean> {
  try {
    // Получаем токен бота из настроек команды
    const team = await prisma.team.findFirst({
      where: { 
        OR: [
          { slug: teamSlug },
          { bookingSlug: teamSlug }
        ]
      },
      select: { telegramBotToken: true }
    })

    if (!team?.telegramBotToken) {
      console.log('❌ Telegram bot token not configured for team:', teamSlug)
      return false
    }

    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    
    // Сортируем параметры
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    
    // Создаем секретный ключ
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(team.telegramBotToken).digest()
    
    // Вычисляем хеш
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    
    return calculatedHash === hash
  } catch (error) {
    console.error('Error validating Telegram data:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, startParam, platform, version, initData, url, timestamp } = body
    
    console.log('🚀 TELEGRAM WEBAPP START:', {
      timestamp,
      user: user ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium
      } : null,
      startParam,
      platform,
      version,
      url,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    })
    
    // Извлекаем salon ID из URL или startParam
    let salonId = null
    if (url) {
      const urlMatch = url.match(/\/book\/([^\/\?]+)/)
      if (urlMatch) {
        salonId = urlMatch[1]
        console.log('🏪 Salon ID extracted from URL:', salonId)
      }
    }
    
    // Проверяем валидность данных (если initData передан)
    let isValid = false
    if (initData && salonId) {
      isValid = await validateTelegramWebAppData(initData, salonId)
      console.log('🔐 Data validation result:', isValid)
    }
    
    if (startParam) {
      console.log('🔗 Start param analysis:', startParam)
      // Можно парсить параметры запуска, например: salon_first, master_123, etc.
    }
    
    // Здесь можно сохранить данные в базу для аналитики
    // await prisma.telegramWebAppSession.create({ ... })
    
    return NextResponse.json({ 
      success: true,
      received_at: new Date().toISOString(),
      data_valid: isValid,
      salon_id: salonId,
      user_detected: !!user
    })
    
  } catch (error) {
    console.error('❌ Error processing Telegram WebApp start:', error)
    return NextResponse.json(
      { error: 'Failed to process start data' },
      { status: 500 }
    )
  }
}