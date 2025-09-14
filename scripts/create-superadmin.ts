import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createSuperAdmin() {
  try {
    console.log('🔐 Создание супер-админа...')
    
    // Проверяем, есть ли уже супер-админ
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })
    
    if (existingAdmin) {
      console.log('✅ Супер-админ уже существует:', existingAdmin.email)
      return
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    // Создаем супер-админа
    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@beauty-booking.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        team: {
          create: {
            teamNumber: 'B0000001',
            name: 'System Team',
            slug: 'system',
            timezone: 'Europe/Moscow',
            status: 'ACTIVE',
            contactPerson: 'Super Admin',
            email: 'admin@beauty-booking.com'
          }
        }
      }
    })
    
    console.log('✅ Супер-админ создан успешно!')
    console.log('📧 Email:', superAdmin.email)
    console.log('🔑 Пароль: admin123')
    console.log('👤 Роль:', superAdmin.role)
    
  } catch (error) {
    console.error('❌ Ошибка создания супер-админа:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()
