'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Archive, ArchiveRestore, Save, X, Upload, Eye, EyeOff } from 'lucide-react'
import PhotoUpload from '@/components/PhotoUpload'

interface ServiceGroup {
  id: string
  name: string
  order: number
  services: Service[]
}

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  photoUrl?: string
  isArchived: boolean
  order: number
  requireConfirmation: boolean
  groupId?: string
  masters?: Master[]
}

interface Master {
  id: string
  firstName: string
  lastName: string
  isActive: boolean
}

export default function ServicesPage() {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [ungroupedName, setUngroupedName] = useState<string>('Основные услуги')
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null)
  const [isCreatingService, setIsCreatingService] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('ungrouped')
  
  // Состояния удаления группы с переносом услуг
  const [showDeleteGroupOptions, setShowDeleteGroupOptions] = useState(false)
  const [deleteTargetGroupId, setDeleteTargetGroupId] = useState<string>('') // '' = Без группы
  const [isProcessingGroupDelete, setIsProcessingGroupDelete] = useState(false)


  // Форма для услуги
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    photoUrl: '',
    groupId: '',
    requireConfirmation: false
  })

  // Форма для группы
  const [groupForm, setGroupForm] = useState({
    name: '',
    order: 0
  })
  const [groupDeleteForm, setGroupDeleteForm] = useState({
    targetGroupId: '' // '' => Без группы
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      
      // Загружаем группы услуг, услуги и мастеров параллельно
      const [groupsResponse, servicesResponse, mastersResponse] = await Promise.all([
        fetch('/api/service-groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/services?includeArchived=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/masters', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setServiceGroups(groupsData)
      } else {
        const errorData = await groupsResponse.json()
        setError(`Ошибка загрузки групп: ${errorData.error || 'Неизвестная ошибка'}`)
      }

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        setServices(servicesData.services || servicesData)
      } else {
        const errorData = await servicesResponse.json()
        setError(`Ошибка загрузки услуг: ${errorData.error || 'Неизвестная ошибка'}`)
      }

      if (mastersResponse.ok) {
        const mastersData = await mastersResponse.json()
        setMasters(mastersData.masters || mastersData)
      } else {
      // Подтягиваем имя "Основные услуги" из настроек команды
      try {
        const token2 = localStorage.getItem('token')
        const r2 = await fetch('/api/team/settings', { headers: { 'Authorization': `Bearer ${token2}` } })
        if (r2.ok) {
          const d2 = await r2.json()
          setUngroupedName(d2.settings?.ungroupedGroupName || 'Основные услуги')
        }
      } catch {}
        const errorData = await mastersResponse.json()
        setError(`Ошибка загрузки мастеров: ${errorData.error || 'Неизвестная ошибка'}`)
      }

      // Настройки шага длительности оставляем по умолчанию 15 минут
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveService = async () => {
    setError(null)
    
    // Валидация на фронтенде
    if (!serviceForm.name.trim()) {
      setError('Название услуги обязательно')
      return
    }
    
    if (!serviceForm.duration || serviceForm.duration <= 0) {
      setError('Нельзя создать услугу длительностью 0 минут')
      return
    }
    
    if (!serviceForm.price || serviceForm.price < 0) {
      setError('Цена должна быть больше 0')
      return
    }

    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services'
      const method = editingService ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(serviceForm)
      })

      if (response.ok) {
        await loadData()
        setEditingService(null)
        setIsCreatingService(false)
        setServiceForm({ name: '', description: '', duration: 60, price: 0, photoUrl: '', groupId: '', requireConfirmation: false })
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Неизвестная ошибка сервера')
      }
    } catch (error) {
      console.error('Ошибка сохранения услуги:', error)
      setError('Ошибка соединения с сервером')
    }
  }

  const handleArchiveService = async (serviceId: string, isArchived: boolean) => {
    setError(null)
    
    const action = isArchived ? 'восстановить' : 'архивировать'
    if (!confirm(`Вы уверены, что хотите ${action} эту услугу?`)) return

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isArchived: !isArchived })
      })

      if (response.ok) {
        await loadData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Ошибка архивирования услуги')
      }
    } catch (error) {
      console.error('Ошибка архивирования услуги:', error)
      setError('Ошибка соединения с сервером')
    }
  }

  const handleSaveGroup = async () => {
    setError(null)
    
    if (!groupForm.name.trim()) {
      setError('Название группы обязательно')
      return
    }

    try {
      const url = editingGroup ? `/api/service-groups/${editingGroup.id}` : '/api/service-groups'
      const method = editingGroup ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(groupForm)
      })

      if (response.ok) {
        await loadData()
        setEditingGroup(null)
        setIsCreatingGroup(false)
        setGroupForm({ name: '', order: 0 })
        setError(null)
        setShowDeleteGroupOptions(false)
        setDeleteTargetGroupId('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Ошибка сохранения группы')
      }
    } catch (error) {
      console.error('Ошибка сохранения группы:', error)
      setError('Ошибка соединения с сервером')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    // Под удаление с переносом услуг — показ формы в UI, а не мгновенный DELETE
    const group = serviceGroups.find(g => g.id === groupId)
    if (!group) return
    setEditingGroup(group)
    setGroupForm({ name: group.name, order: group.order })
    setShowDeleteGroupOptions(true)
    setDeleteTargetGroupId('')
  }

  const startEditingService = (service: Service) => {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      photoUrl: service.photoUrl || '',
      groupId: service.groupId || '',
      requireConfirmation: service.requireConfirmation
    })
    setError(null)
  }

  const startEditingGroup = (group: ServiceGroup) => {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      order: group.order
    })
    setError(null)
    setShowDeleteGroupOptions(false)
    setDeleteTargetGroupId('')
    // Открываем модалку редактирования
    setIsGroupModalOpen(true)
  }

  const startCreatingService = (defaultGroupId?: string) => {
    setIsCreatingService(true)
    setServiceForm({ name: '', description: '', duration: 60, price: 0, photoUrl: '', groupId: defaultGroupId || '', requireConfirmation: false })
    setError(null)
  }

  const startCreatingGroup = () => {
    setIsCreatingGroup(true)
    setGroupForm({ name: '', order: serviceGroups.length })
    setError(null)
  }

  const cancelEditing = () => {
    setEditingService(null)
    setEditingGroup(null)
    setIsCreatingService(false)
    setIsCreatingGroup(false)
    setServiceForm({ name: '', description: '', duration: 60, price: 0, photoUrl: '', groupId: '', requireConfirmation: false })
    setGroupForm({ name: '', order: 0 })
    setError(null)
    setShowDeleteGroupOptions(false)
    setDeleteTargetGroupId('')
    setIsGroupModalOpen(false)
  }

  // Переименование раздела без группы ("Основные услуги")
  const renameUngrouped = async () => {
    try {
      const current = ungroupedName || 'Основные услуги'
      const input = prompt('Новое название для раздела без группы', current)
      if (input === null) return
      const newName = input.trim()
      if (!newName || newName === current) return
      const token = localStorage.getItem('token')
      const res = await fetch('/api/team/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ungroupedGroupName: newName })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Не удалось переименовать раздел')
      }
      setUngroupedName(data.settings?.ungroupedGroupName || newName)
    } catch (e: any) {
      setError(e?.message || 'Ошибка переименования')
    }
  }

  // Фильтруем услуги по статусу архивирования
  const filteredServices = services.filter(service => showArchived ? service.isArchived : !service.isArchived)

  // Группируем услуги по группам
  const groupedServices = serviceGroups.map(group => ({
    ...group,
    services: filteredServices.filter(service => service.groupId === group.id)
  }))

  // Услуги без группы
  const ungroupedServices = filteredServices.filter(service => !service.groupId)
  const groupsWithCounts = serviceGroups.map(group => ({
    ...group,
    servicesCount: filteredServices.filter(service => service.groupId === group.id).length
  }))
  const orderedGroups = groupsWithCounts.slice().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  const activeGroup = activeTab !== 'ungrouped' ? orderedGroups.find(g => g.id === activeTab) : null
  
  // Пресеты длительности (минуты) и форматирование длительности для UX
  const durationPresets = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180]
  const getHoursWord = (hours: number) => {
    const mod100 = hours % 100
    if (mod100 >= 11 && mod100 <= 14) return 'часов'
    const mod10 = hours % 10
    if (mod10 === 1) return 'час'
    if (mod10 >= 2 && mod10 <= 4) return 'часа'
    return 'часов'
  }
  const formatDurationRu = (minutes: number) => {
    if (!minutes) return '0 минут'
    if (minutes < 60) return `${minutes} минут`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    if (rest === 0) return `${hours} ${getHoursWord(hours)}`
    return `${hours} ${getHoursWord(hours)} ${rest} минут`
  }
  
  // Запрет переключения вкладок при редактировании/создании услуги
  const handleSelectTab = async (targetId: string) => {
    if (editingService || isCreatingService) {
      const wantSave = confirm('У вас есть несохраненная услуга. Сохранить изменения?')
      if (wantSave) {
        await handleSaveService()
        setActiveTab(targetId)
        return
      }
      const wantCancel = confirm('Отменить создание/редактирование услуги? Несохраненные изменения будут потеряны.')
      if (wantCancel) {
        cancelEditing()
        setActiveTab(targetId)
      }
      return
    }
    setActiveTab(targetId)
  }
  
  // Сортировка порядка групп отключена по требованию — изменение порядка недоступно

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Управление услугами</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-md flex items-center ${
              showArchived 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showArchived ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showArchived ? 'Скрыть архив' : 'Показать архив'}
          </button>
        </div>
      </div>

      {/* Закладки групп услуг (скрываем при редактировании/создании услуги) */}
      {!isCreatingService && !editingService && (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => handleSelectTab('ungrouped')}
            className={`${activeTab === 'ungrouped' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-3 py-1.5 rounded-md text-sm whitespace-nowrap`}
          >
            {ungroupedName} ({ungroupedServices.length})
          </button>
          <button
            onClick={renameUngrouped}
            className="p-1 rounded hover:bg-gray-200 text-gray-500"
            title="Переименовать раздел без группы"
          >
            <Edit className="w-4 h-4" />
          </button>
          {orderedGroups.map(group => (
            <div key={group.id} className="inline-flex items-center gap-1">
              <button
                onClick={() => handleSelectTab(group.id)}
                className={`${activeTab === group.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-3 py-1.5 rounded-md text-sm whitespace-nowrap`}
                title={group.name}
              >
                {group.name} ({group.servicesCount})
              </button>
              <button
                onClick={() => startEditingGroup(group)}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"
                title="Переименовать группу"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={startCreatingGroup}
            className="ml-auto sm:ml-2 px-2 py-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
            title="Добавить группу"
          >
            <Plus className="w-4 h-4" />
          </button>
          {activeGroup && (
            <button
              onClick={() => startEditingGroup(activeGroup)}
              className="px-2 py-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
              title="Переименовать группу"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      )}

      {/* Показываем ошибки */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-800">
              <strong>Ошибка:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Форма создания группы (инлайн) */}
      {isCreatingGroup && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Новая группа
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название группы *
              </label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: Парикмахерские услуги"
              />
            </div>
            {/* Порядок скрыт — управляется переносом вкладок или ↑/↓ */}
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveGroup}
              disabled={!groupForm.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Редактирование группы (модальное окно) */}
      {editingGroup && isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={cancelEditing} />
          <div className="relative bg-white rounded-lg border border-gray-200 p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Редактировать группу</h3>
              <button onClick={cancelEditing} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Название группы *</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Например: Парикмахерские услуги"
                />
              </div>
              <div className="mt-2 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Удаление группы</h4>
                {editingGroup.services && editingGroup.services.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">В группе есть услуги. Выберите, куда их перенести перед удалением группы.</p>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700">Перенести услуги в:</label>
                      <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                        value={deleteTargetGroupId}
                        onChange={(e) => setDeleteTargetGroupId(e.target.value)}
                      >
                        <option value="">{ungroupedName}</option>
                        {serviceGroups.filter(g => g.id !== editingGroup.id).map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('Удалить группу и перенести услуги?')) return
                        setIsProcessingGroupDelete(true)
                        try {
                          const token = localStorage.getItem('token')
                          if (!token) return
                          if (deleteTargetGroupId !== undefined) {
                            await fetch('/api/services/move-group', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ fromGroupId: editingGroup.id, toGroupId: deleteTargetGroupId || null })
                            })
                          }
                          const resp = await fetch(`/api/service-groups/${editingGroup.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                          if (!resp.ok) {
                            const ed = await resp.json()
                            throw new Error(ed.error || 'Ошибка удаления группы')
                          }
                          await loadData()
                          setEditingGroup(null)
                          setShowDeleteGroupOptions(false)
                          setDeleteTargetGroupId('')
                          setIsGroupModalOpen(false)
                        } catch (err) {
                          console.error(err)
                          setError('Ошибка при удалении группы')
                        } finally {
                          setIsProcessingGroupDelete(false)
                        }
                      }}
                      disabled={isProcessingGroupDelete}
                      className={`px-4 py-2 rounded-md text-white ${isProcessingGroupDelete ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {isProcessingGroupDelete ? 'Удаление...' : 'Удалить группу'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      onClick={async () => {
                        if (!confirm('Удалить пустую группу?')) return
                        try {
                          const token = localStorage.getItem('token')
                          if (!token) return
                          const resp = await fetch(`/api/service-groups/${editingGroup.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                          if (!resp.ok) {
                            const ed = await resp.json()
                            throw new Error(ed.error || 'Ошибка удаления группы')
                          }
                          await loadData()
                          setEditingGroup(null)
                          setIsGroupModalOpen(false)
                        } catch (err) {
                          console.error(err)
                          setError('Ошибка при удалении группы')
                        }
                      }}
                      className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      Удалить группу
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={!groupForm.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Форма создания/редактирования услуги */}
      {(isCreatingService || editingService) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingService ? 'Редактировать услугу' : 'Новая услуга'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название услуги *
              </label>
              <input
                type="text"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: Стрижка женская"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Группа
              </label>
               <select
                 value={serviceForm.groupId}
                 onChange={(e) => setServiceForm({...serviceForm, groupId: e.target.value})}
                 className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
               >
                <option value="">{ungroupedName}</option>
                {serviceGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              {editingService && (
                <p className="text-xs text-gray-500 mt-1">Можно перенести услугу в другую группу, выбрав её здесь.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Продолжительность (мин) *
              </label>
              {(() => {
                const allowedMinutes = [0, 15, 30, 45]
                const rawHours = Math.floor((serviceForm.duration || 0) / 60)
                const rawMinutes = (serviceForm.duration || 0) % 60
                const hoursValue = Math.max(0, Math.min(10, rawHours))
                const minutesValue = allowedMinutes.includes(rawMinutes) ? rawMinutes : 0
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700 whitespace-nowrap">Часы</label>
                        <select
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                        value={hoursValue}
                        onChange={(e) => {
                          const h = parseInt(e.target.value)
                          const total = h * 60 + minutesValue
                          setServiceForm({ ...serviceForm, duration: total })
                        }}
                      >
                        {[0,1,2,3,4,5,6,7,8,9,10].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-1">
                      <label className="text-sm text-gray-700 whitespace-nowrap">Минуты</label>
                        <select
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                        value={minutesValue}
                        onChange={(e) => {
                          const m = parseInt(e.target.value)
                          const total = hoursValue * 60 + m
                          setServiceForm({ ...serviceForm, duration: total })
                        }}
                      >
                        {[0,15,30,45].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm text-gray-500 md:text-right">
                      {formatDurationRu(serviceForm.duration)}
                    </div>
                  </div>
                )
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Базовая цена (₽) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({...serviceForm, price: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px] focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Описание услуги..."
              />
            </div>
            <div className="md:col-span-2">
              <PhotoUpload
                label="Фото услуги"
                currentPhotoUrl={serviceForm.photoUrl}
                onPhotoChange={(photoUrl) => setServiceForm({...serviceForm, photoUrl})}
                onPhotoRemove={() => setServiceForm({...serviceForm, photoUrl: ''})}
              />
            </div>
            {/* Убрали опцию "Требовать подтверждение записи" в MVP */}
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveService}
              disabled={!serviceForm.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Контент активной закладки (скрываем при редактировании/создании услуги) */}
      {!isCreatingService && !editingService && (
      <div className="space-y-6 pb-24">
        {activeTab === 'ungrouped' ? (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <h3 className="text-lg font-medium text-gray-900">{ungroupedName} {showArchived && '(Архив)'}</h3>
              <button
                onClick={() => startCreatingService('')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> Добавить услугу
              </button>
            </div>
            <div className="p-6">
              {ungroupedServices.length === 0 ? (
                <div className="text-sm text-gray-500">Нет услуг в этой вкладке.</div>
              ) : (
                <div className="bg-white border rounded-md overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {ungroupedServices.map(service => (
                      <li key={service.id}>
                        <div className="px-4 py-3 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                {service.photoUrl ? (
                                  <img className="h-12 w-12 rounded object-cover" src={service.photoUrl} alt={service.name} />
                                ) : (
                                  <div className="h-12 w-12 rounded bg-gray-200" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium text-gray-900 ${service.isArchived ? 'opacity-60' : ''}`}>{service.name}</p>
                                  <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">{service.price} ₽</span>
                                  <span className="px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-700 border border-slate-200 whitespace-nowrap">{formatDurationRu(service.duration)}</span>
                                </div>
                                {service.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{service.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!service.isArchived && (
                                <button
                                  onClick={() => startEditingService(service)}
                                  className="p-2 text-gray-400 hover:text-blue-600"
                                  title="Редактировать"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleArchiveService(service.id, service.isArchived)}
                                className={`p-2 ${service.isArchived ? 'text-gray-400 hover:text-green-600' : 'text-gray-400 hover:text-orange-600'}`}
                                title={service.isArchived ? 'Восстановить' : 'Архивировать'}
                              >
                                {service.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <h3 className="text-lg font-medium text-gray-900">{activeGroup?.name} {showArchived && '(Архив)'}</h3>
              {activeGroup && (
                <>
                  <button
                    onClick={() => startEditingGroup(activeGroup)}
                    className="ml-3 p-2 text-gray-400 hover:text-blue-600"
                    title="Переименовать группу"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCreatingService(activeGroup.id)}
                    className="ml-3 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                    title="Добавить услугу"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Добавить услугу
                  </button>
                </>
              )}
            </div>
            <div className="p-6">
              {(() => {
                const group = groupedServices.find(g => g.id === activeTab)
                const list = group?.services || []
                if (list.length === 0) return (<div className="text-sm text-gray-500">Нет услуг в этой вкладке.</div>)
                return (
                  <div className="bg-white border rounded-md overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {list.map(service => (
                        <li key={service.id}>
                          <div className="px-4 py-3 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  {service.photoUrl ? (
                                    <img className="h-12 w-12 rounded object-cover" src={service.photoUrl} alt={service.name} />
                                  ) : (
                                    <div className="h-12 w-12 rounded bg-gray-200" />
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-medium text-gray-900 ${service.isArchived ? 'opacity-60' : ''}`}>{service.name}</p>
                                    <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">{service.price} ₽</span>
                                    <span className="px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-700 border border-slate-200 whitespace-nowrap">{formatDurationRu(service.duration)}</span>
                                  </div>
                                  {service.description && (
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{service.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {!service.isArchived && (
                                  <button onClick={() => startEditingService(service)} className="p-2 text-gray-400 hover:text-blue-600" title="Редактировать">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleArchiveService(service.id, service.isArchived)}
                                  className={`p-2 ${service.isArchived ? 'text-gray-400 hover:text-green-600' : 'text-gray-400 hover:text-orange-600'}`}
                                  title={service.isArchived ? 'Восстановить' : 'Архивировать'}
                                >
                                  {service.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {serviceGroups.length === 0 && ungroupedServices.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">{showArchived ? 'Нет архивных услуг' : 'У вас пока нет услуг'}</p>
            {!showArchived && (
              <button onClick={() => startCreatingService(activeTab === 'ungrouped' ? '' : activeTab)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Добавить первую услугу</button>
            )}
          </div>
        )}
      </div>
      )}
      {/* FAB: Добавить услугу (мобильный) — скрываем при редактировании/создании услуги */}
      {!isCreatingService && !editingService && (
      <div className="fixed bottom-20 right-5 sm:hidden">
        <button
          onClick={() => startCreatingService(activeTab === 'ungrouped' ? '' : activeTab)}
          className="rounded-full bg-blue-600 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-14 h-14 flex items-center justify-center"
          aria-label="Добавить услугу"
          title="Добавить услугу"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      )}
    </div>
  )
}