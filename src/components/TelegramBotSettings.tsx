'use client'

import { useState } from 'react'

interface TelegramBotSettingsProps {
  currentToken: string | null
  onUpdate: (token: string | null) => Promise<void>
}

const TelegramBotSettings: React.FC<TelegramBotSettingsProps> = ({
  currentToken,
  onUpdate
}) => {
  const [token, setToken] = useState(currentToken || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Валидация токена
      if (token.trim()) {
        const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/
        if (!tokenPattern.test(token.trim())) {
          throw new Error('Неверный формат токена. Токен должен быть в формате: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz')
        }
      }

      await onUpdate(token.trim() || null)
      setSuccess('Настройки Telegram бота обновлены')
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setToken(currentToken || '')
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const handleTestToken = async () => {
    const effectiveToken = (isEditing ? token : (currentToken || '')).trim()
    if (!effectiveToken) {
      setError('Сначала добавьте токен бота')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`https://api.telegram.org/bot${effectiveToken}/getMe`)
      const data = await response.json()

      if (data.ok) {
        setSuccess(`✅ Токен работает! Бот: @${data.result.username} (${data.result.first_name})`)
      } else {
        throw new Error(`Ошибка API Telegram: ${data.description}`)
      }
    } catch (err: any) {
      setError(`Ошибка проверки токена: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetMiniApp = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const auth = localStorage.getItem('token')
      if (!auth) throw new Error('Не найден токен авторизации')
      const resp = await fetch('/api/team/telegram/set-menu-button', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` }
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Не удалось назначить Mini App')
      setSuccess(`✅ Mini App назначен. Кнопка открывает: ${data.url}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🤖 Telegram Bot
        </h3>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {currentToken ? 'Изменить' : 'Добавить'}
            </button>
          )}
          <button
            onClick={handleTestToken}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Проверить токен
          </button>
          <button
            onClick={handleSetMiniApp}
            disabled={isLoading || !(currentToken || (isEditing && token.trim()))}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Назначить Mini App
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Токен бота
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Получите токен у @BotFather в Telegram
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs font-medium text-gray-800 mb-1">Как создать бота и получить API KEY:</p>
            <ol className="text-xs text-gray-700 space-y-1 list-decimal ml-5">
              <li>Откройте @BotFather в Telegram</li>
              <li>Отправьте /newbot и задайте имя и username</li>
              <li>Скопируйте выданный токен (API KEY)</li>
              <li>Вставьте токен выше и нажмите «Сохранить»</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {currentToken ? (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Токен:</span>
                <span className="text-sm text-gray-500">••••••••••••••••••••••••••••••••</span>
              </div>
              <p className="text-xs text-gray-500">
                Токен настроен. WebApp будет работать с этим ботом.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">
                Telegram бот не настроен
              </p>
              <p className="text-xs text-gray-400">
                Добавьте токен бота для интеграции с Telegram WebApp
              </p>
            </div>
          )}

          {/* Инструкцию убрали по требованию */}

          {currentToken && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                ✅ Следующий шаг:
              </h4>
              <p className="text-xs text-green-800 mb-2">
                Настройте Mini App в @BotFather:
              </p>
              <ol className="text-xs text-green-800 space-y-1">
                <li>1. Отправьте /mybots в @BotFather</li>
                <li>2. Выберите вашего бота</li>
                <li>3. Bot Settings → Mini App</li>
                <li>4. Установите URL: https://test.2minutes.ru/book/{currentToken ? 'your-slug' : 'first'}</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TelegramBotSettings