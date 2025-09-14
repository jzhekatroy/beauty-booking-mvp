'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Eye, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function TestUIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 Тестирование UI от Lovable
          </h1>
          <p className="text-gray-600 text-xl">
            Сравните оригинальный дизайн с улучшенным дизайном от Lovable
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Оригинальная версия */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Eye className="w-7 h-7 text-gray-600" />
                Оригинальная версия
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                <p className="text-gray-600 text-lg">
                  Стандартный дизайн с базовыми стилями
                </p>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Простые карточки
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Базовые цвета
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Стандартная типографика
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Минимальные анимации
                  </li>
                </ul>
                <div className="pt-4">
                  <Link href="/book/beauty-salon">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700 py-4 text-lg font-semibold rounded-xl">
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Посмотреть оригинал
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Улучшенная версия от Lovable */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Sparkles className="w-7 h-7 text-blue-600" />
                Улучшенная версия от Lovable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                <p className="text-gray-600 text-lg">
                  Современный дизайн с улучшенным UX
                </p>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                    Градиенты и тени
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                    Анимации и переходы
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                    Улучшенная типографика
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                    Современные компоненты
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                    Лучшая мобильная адаптация
                  </li>
                </ul>
                <div className="pt-4">
                  <Link href="/book/beauty-salon?lovable=true">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Посмотреть улучшенную версию
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Инструкции */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-green-800 flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
              📋 Как протестировать
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-green-700">
            <ol className="list-decimal list-inside space-y-3 text-lg">
              <li>Нажмите на кнопки выше, чтобы переключиться между версиями</li>
              <li>Протестируйте все шаги записи: выбор услуг → дата/время → контакты</li>
              <li>Проверьте мобильную версию (F12 → Device Toolbar)</li>
              <li>Сравните анимации и переходы</li>
              <li>Оцените общий пользовательский опыт</li>
            </ol>
            
            <div className="mt-8 p-6 bg-white/50 rounded-xl border border-green-200">
              <h3 className="font-bold text-green-800 mb-3">🔗 Прямые ссылки:</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Оригинал:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
                    /book/beauty-salon
                  </code>
                </div>
                <div>
                  <span className="font-medium">Lovable:</span>
                  <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-sm">
                    /book/beauty-salon?lovable=true
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
