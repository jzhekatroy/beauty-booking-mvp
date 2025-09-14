'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Eye } from 'lucide-react'
import Link from 'next/link'

export default function TestLovablePage() {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/book/beauty-salon" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Назад к записи
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎨 Тестирование UI от Lovable
          </h1>
          <p className="text-gray-600 text-lg">
            Сравните оригинальный дизайн с улучшенным дизайном от Lovable
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Оригинальная версия */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Eye className="w-6 h-6 text-gray-600" />
                Оригинальная версия
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-gray-600">
                  Стандартный дизайн с базовыми стилями
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Простые карточки</li>
                  <li>• Базовые цвета</li>
                  <li>• Стандартная типографика</li>
                  <li>• Минимальные анимации</li>
                </ul>
                <Link href="/book/beauty-salon">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700">
                    Посмотреть оригинал
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Улучшенная версия от Lovable */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Улучшенная версия от Lovable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-gray-600">
                  Современный дизайн с улучшенным UX
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Градиенты и тени</li>
                  <li>• Анимации и переходы</li>
                  <li>• Улучшенная типографика</li>
                  <li>• Современные компоненты</li>
                  <li>• Лучшая мобильная адаптация</li>
                </ul>
                <Link href="/book/beauty-salon?lovable=true">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Посмотреть улучшенную версию
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Инструкции */}
        <Card className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-green-800">
              📋 Как протестировать
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-green-700">
            <ol className="list-decimal list-inside space-y-2">
              <li>Нажмите на кнопки выше, чтобы переключиться между версиями</li>
              <li>Протестируйте все шаги записи: выбор услуг → дата/время → контакты</li>
              <li>Проверьте мобильную версию (F12 → Device Toolbar)</li>
              <li>Сравните анимации и переходы</li>
              <li>Оцените общий пользовательский опыт</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
