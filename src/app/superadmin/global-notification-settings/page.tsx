'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, RotateCcw, Info } from 'lucide-react'

interface GlobalNotificationSettings {
  id: string
  maxRequestsPerMinute: number
  requestDelayMs: number
  maxRetryAttempts: number
  retryDelayMs: number
  exponentialBackoff: boolean
  failureThreshold: number
  recoveryTimeoutMs: number
  enabled: boolean
  telegramRatePerMinute: number
  telegramPerChatPerMinute: number
  maxConcurrentSends: number
}

export default function GlobalNotificationSettingsPage() {
  const [settings, setSettings] = useState<GlobalNotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Загрузка настроек
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/superadmin/global-notification-settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data.settings)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        setMessage({ type: 'error', text: 'Ошибка загрузки настроек' })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Сохранение настроек
  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/superadmin/global-notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки сохранены успешно' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Ошибка сохранения' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' })
    } finally {
      setSaving(false)
    }
  }

  // Сброс к дефолтным
  const handleReset = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/superadmin/global-notification-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setMessage({ type: 'success', text: 'Настройки сброшены к дефолтным' })
      } else {
        setMessage({ type: 'error', text: 'Ошибка сброса настроек' })
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
      setMessage({ type: 'error', text: 'Ошибка сброса настроек' })
    } finally {
      setSaving(false)
    }
  }

  // Обновление значения
  const updateSetting = (key: keyof GlobalNotificationSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Ошибка загрузки настроек. Попробуйте обновить страницу.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Глобальные настройки уведомлений</h1>
        <p className="text-gray-600 mt-2">
          Настройки системы отправки уведомлений для всех команд
        </p>
        <div className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
          <p className="mb-1">
            Здесь задаются единые ограничения и поведение отправки сообщений. Они применяются ко всем командам без исключений.
          </p>
          <p>
            Важно: фактическая скорость отправки сообщений определяется сочетанием общего лимита запросов в минуту и специализированных лимитов Telegram. Если оба лимита заданы, действует более строгий.
          </p>
        </div>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Общие настройки */}
        <Card>
          <CardHeader>
            <CardTitle>Общие настройки</CardTitle>
            <CardDescription>
              Включение/отключение системы уведомлений
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
              />
              <Label htmlFor="enabled">Включить отправку уведомлений</Label>
            </div>
            <p className="text-sm text-gray-500">
              При отключении система не будет выполнять отправку сообщений (все задачи останутся в очереди).
            </p>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Limiting - Ограничение скорости</CardTitle>
            <CardDescription>
              Контроль скорости отправки сообщений для предотвращения превышения лимитов API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxRequestsPerMinute">Максимум запросов в минуту</Label>
                <Input
                  id="maxRequestsPerMinute"
                  type="number"
                  min="0"
                  value={settings.maxRequestsPerMinute}
                  onChange={(e) => updateSetting('maxRequestsPerMinute', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Общий лимит на все исходящие запросы сервиса (включая Telegram и будущие интеграции). 
                  0 — отключить общий лимит. Рекомендуется оставить 0 и опираться на Telegram‑лимиты.
                </p>
              </div>
              <div>
                <Label htmlFor="requestDelayMs">Задержка между запросами (мс)</Label>
                <Input
                  id="requestDelayMs"
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.requestDelayMs}
                  onChange={(e) => updateSetting('requestDelayMs', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Минимальная пауза между последовательными запросами воркера. Рекомендуется: 2000–3000 мс.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="telegramRatePerMinute">Telegram: сообщений/мин на команду</Label>
                <Input
                  id="telegramRatePerMinute"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.telegramRatePerMinute}
                  onChange={(e) => updateSetting('telegramRatePerMinute', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Лимит для Telegram, считаемый отдельно для каждой команды (окно 1 минута). 
                  Предотвращает превышение лимитов Telegram и обеспечивает равномерность отправки между командами.
                </p>
              </div>
              <div>
                <Label htmlFor="telegramPerChatPerMinute">Telegram: сообщений/мин в один чат</Label>
                <Input
                  id="telegramPerChatPerMinute"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.telegramPerChatPerMinute}
                  onChange={(e) => updateSetting('telegramPerChatPerMinute', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ограничивает частоту отправки в один конкретный чат (пользователя), чтобы избежать спама/флуда.
                </p>
              </div>
              <div>
                <Label htmlFor="maxConcurrentSends">Telegram: параллельных отправок</Label>
                <Input
                  id="maxConcurrentSends"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxConcurrentSends}
                  onChange={(e) => updateSetting('maxConcurrentSends', parseInt(e.target.value))}
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  Максимальное число одновременных операций отправки Telegram‑сообщений. 
                  Сейчас параметр не задействован воркером, поле отключено (на будущее).
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
              <p className="mb-1">
                Взаимодействие лимитов: на практике применяется более строгий из лимитов — общий (запросы/мин) и Telegram‑специфические. 
                Например, если общий лимит 25/мин, а Telegram на команду 15/мин, то конкретная команда не превысит 15/мин, а суммарно сервис — 25/мин.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retry Logic */}
        <Card>
          <CardHeader>
            <CardTitle>Retry Logic - Повторные попытки</CardTitle>
            <CardDescription>
              Настройки повторной отправки сообщений при сбоях
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxRetryAttempts">Максимум попыток</Label>
                <Input
                  id="maxRetryAttempts"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRetryAttempts}
                  onChange={(e) => updateSetting('maxRetryAttempts', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Максимальное число повторов при временных ошибках (сетевые сбои, 429 и т.п.).
                </p>
              </div>
              <div>
                <Label htmlFor="retryDelayMs">Задержка между попытками (мс)</Label>
                <Input
                  id="retryDelayMs"
                  type="number"
                  min="1000"
                  max="30000"
                  value={settings.retryDelayMs}
                  onChange={(e) => updateSetting('retryDelayMs', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Базовая задержка между повторами (при включённом экспоненциальном росте — увеличивается кратно).
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="exponentialBackoff"
                checked={settings.exponentialBackoff}
                onCheckedChange={(checked) => updateSetting('exponentialBackoff', checked)}
              />
              <Label htmlFor="exponentialBackoff">Экспоненциальная задержка</Label>
            </div>
            <p className="text-sm text-gray-500">
              При включении задержка увеличивается с каждой попыткой: 5с → 10с → 20с
            </p>
          </CardContent>
        </Card>

        {/* Circuit Breaker */}
        <Card>
          <CardHeader>
            <CardTitle>Circuit Breaker - Автоматический выключатель</CardTitle>
            <CardDescription>
              Защита от каскадных сбоев при проблемах с внешними сервисами
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Что такое Circuit Breaker?</strong><br/>
                Это паттерн, который автоматически отключает отправку сообщений при превышении порога ошибок.
                Предотвращает перегрузку системы и экономит ресурсы при проблемах с Telegram API.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="failureThreshold">Порог ошибок</Label>
                <Input
                  id="failureThreshold"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.failureThreshold}
                  onChange={(e) => updateSetting('failureThreshold', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Количество ошибок подряд для срабатывания выключателя
                </p>
              </div>
              <div>
                <Label htmlFor="recoveryTimeoutMs">Время восстановления (мс)</Label>
                <Input
                  id="recoveryTimeoutMs"
                  type="number"
                  min="10000"
                  max="300000"
                  value={settings.recoveryTimeoutMs}
                  onChange={(e) => updateSetting('recoveryTimeoutMs', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Время ожидания перед повторной попыткой (рекомендуется: 60000 мс = 1 мин)
                </p>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Как работает Circuit Breaker:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. <strong>Закрыт</strong> - отправка работает нормально</li>
                <li>2. <strong>Открыт</strong> - при превышении порога ошибок, отправка блокируется</li>
                <li>3. <strong>Полуоткрыт</strong> - через время восстановления пробует отправить тестовое сообщение</li>
                <li>4. Если успешно - возвращается в "Закрыт", если нет - снова "Открыт"</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Кнопки действий */}
        <div className="flex space-x-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить настройки
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Сбросить к дефолтным
          </Button>
        </div>
      </div>
    </div>
  )
}
