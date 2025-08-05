import { PrismaClient, UserRole, TeamStatus, BookingStatus } from '@prisma/client'
import { hashPassword, generateTeamNumber, generateBookingNumber } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

  // Создаем супер-админа
  const superAdminTeam = await prisma.team.create({
    data: {
      teamNumber: 'B0000001',
      name: 'Система управления',
      slug: 'system',
      contactPerson: 'Супер Админ',
      email: 'admin@beauty-booking.com',
      masterLimit: 0,
    }
  })

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@beauty-booking.com',
      password: await hashPassword('admin123'),
      role: UserRole.SUPER_ADMIN,
      firstName: 'Супер',
      lastName: 'Админ',
      teamId: superAdminTeam.id,
    }
  })

  console.log('✅ Супер-админ создан: admin@beauty-booking.com / admin123')

  // Создаем тестовый салон
  const testTeam = await prisma.team.create({
    data: {
      teamNumber: generateTeamNumber(),
      name: 'Beauty Salon',
      slug: 'beauty-salon',
      contactPerson: 'Мария Петрова',
      email: 'salon@example.com',
      masterLimit: 5,
      bookingStep: 15,
      requireConfirmation: false,
    }
  })

  // Создаем администратора салона
  const teamAdmin = await prisma.user.create({
    data: {
      email: 'salon@example.com',
      password: await hashPassword('password123'),
      role: UserRole.ADMIN,
      firstName: 'Мария',
      lastName: 'Петрова',
      teamId: testTeam.id,
    }
  })

  // Создаем мастеров
  const master1User = await prisma.user.create({
    data: {
      email: 'anna@example.com',
      password: await hashPassword('password123'),
      role: UserRole.MASTER,
      firstName: 'Анна',
      lastName: 'Козлова',
      teamId: testTeam.id,
    }
  })

  const master1 = await prisma.master.create({
    data: {
      firstName: 'Анна',
      lastName: 'Козлова',
      description: 'Мастер маникюра и педикюра с опытом 5 лет',
      userId: master1User.id,
      teamId: testTeam.id,
    }
  })

  const master2User = await prisma.user.create({
    data: {
      email: 'elena@example.com',
      password: await hashPassword('password123'),
      role: UserRole.MASTER,
      firstName: 'Елена',
      lastName: 'Сидорова',
      teamId: testTeam.id,
    }
  })

  const master2 = await prisma.master.create({
    data: {
      firstName: 'Елена',
      lastName: 'Сидорова',
      description: 'Парикмахер-стилист, специалист по окрашиванию',
      userId: master2User.id,
      teamId: testTeam.id,
    }
  })

  // Создаем расписание для мастеров
  // Анна работает Пн-Пт 9:00-18:00
  for (let day = 1; day <= 5; day++) {
    await prisma.masterSchedule.create({
      data: {
        masterId: master1.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        breakStart: '13:00',
        breakEnd: '14:00',
      }
    })
  }

  // Елена работает Вт-Сб 10:00-19:00
  for (let day = 2; day <= 6; day++) {
    await prisma.masterSchedule.create({
      data: {
        masterId: master2.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '19:00',
        breakStart: '14:00',
        breakEnd: '15:00',
      }
    })
  }

  // Создаем группы услуг
  const hairGroup = await prisma.serviceGroup.create({
    data: {
      name: 'Парикмахерские услуги',
      order: 1,
      teamId: testTeam.id,
    }
  })

  const nailGroup = await prisma.serviceGroup.create({
    data: {
      name: 'Маникюр и педикюр',
      order: 2,
      teamId: testTeam.id,
    }
  })

  // Создаем услуги
  const hairServices = [
    { name: 'Стрижка женская', duration: 60, price: 2500, description: 'Стрижка любой сложности' },
    { name: 'Стрижка мужская', duration: 45, price: 1500, description: 'Классическая мужская стрижка' },
    { name: 'Окрашивание', duration: 180, price: 5000, description: 'Окрашивание в один тон' },
    { name: 'Укладка', duration: 45, price: 1200, description: 'Укладка волос феном' },
    { name: 'Мелирование', duration: 240, price: 7000, description: 'Мелирование волос' },
  ]

  const nailServices = [
    { name: 'Маникюр классический', duration: 90, price: 1800, description: 'Обрезной маникюр с покрытием' },
    { name: 'Маникюр аппаратный', duration: 75, price: 2000, description: 'Аппаратный маникюр с покрытием' },
    { name: 'Педикюр', duration: 120, price: 2500, description: 'Классический педикюр' },
    { name: 'Наращивание ногтей', duration: 150, price: 3500, description: 'Наращивание гелем' },
  ]

  for (const service of hairServices) {
    await prisma.service.create({
      data: {
        ...service,
        teamId: testTeam.id,
        groupId: hairGroup.id,
        masters: {
          connect: [{ id: master2.id }] // Елена - парикмахер
        }
      }
    })
  }

  for (const service of nailServices) {
    await prisma.service.create({
      data: {
        ...service,
        teamId: testTeam.id,
        groupId: nailGroup.id,
        masters: {
          connect: [{ id: master1.id }] // Анна - мастер маникюра
        }
      }
    })
  }

  // Создаем тестовых клиентов
  const clients = [
    { email: 'anna.ivanova@example.com', firstName: 'Анна', lastName: 'Иванова', phone: '+7 900 123-45-67' },
    { email: 'elena.sidorova@example.com', firstName: 'Елена', lastName: 'Сидорова', phone: '+7 900 234-56-78' },
    { email: 'olga.fedorova@example.com', firstName: 'Ольга', lastName: 'Федорова', phone: '+7 900 345-67-89' },
    { email: 'maria.smirnova@example.com', firstName: 'Мария', lastName: 'Смирнова', phone: '+7 900 456-78-90' },
  ]

  const createdClients = []
  for (const client of clients) {
    const createdClient = await prisma.client.create({
      data: {
        ...client,
        teamId: testTeam.id,
      }
    })
    createdClients.push(createdClient)
  }

  // Получаем услуги для создания бронирований
  const services = await prisma.service.findMany({
    where: { teamId: testTeam.id }
  })

  // Создаем тестовые бронирования
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  // Бронирование 1: Маникюр у Анны
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: generateBookingNumber(),
      startTime: new Date(tomorrow.getTime()),
      endTime: new Date(tomorrow.getTime() + 90 * 60 * 1000), // +90 минут
      totalPrice: 1800,
      status: BookingStatus.CONFIRMED,
      teamId: testTeam.id,
      clientId: createdClients[0].id,
      masterId: master1.id,
      notes: 'Первое посещение',
    }
  })

  // Связываем с услугой
  await prisma.bookingService.create({
    data: {
      bookingId: booking1.id,
      serviceId: services.find(s => s.name === 'Маникюр классический')!.id,
      price: 1800,
    }
  })

  // Бронирование 2: Стрижка у Елены
  const nextDay = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
  nextDay.setHours(14, 0, 0, 0)

  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: generateBookingNumber(),
      startTime: nextDay,
      endTime: new Date(nextDay.getTime() + 60 * 60 * 1000), // +60 минут
      totalPrice: 2500,
      status: BookingStatus.CREATED,
      teamId: testTeam.id,
      clientId: createdClients[1].id,
      masterId: master2.id,
    }
  })

  await prisma.bookingService.create({
    data: {
      bookingId: booking2.id,
      serviceId: services.find(s => s.name === 'Стрижка женская')!.id,
      price: 2500,
    }
  })

  // Создаем логи для бронирований
  await prisma.bookingLog.create({
    data: {
      bookingId: booking1.id,
      action: 'CREATED',
      description: 'Бронирование создано клиентом',
      teamId: testTeam.id,
    }
  })

  await prisma.bookingLog.create({
    data: {
      bookingId: booking1.id,
      action: 'CONFIRMED',
      description: 'Бронирование подтверждено администратором',
      userId: teamAdmin.id,
      teamId: testTeam.id,
    }
  })

  await prisma.bookingLog.create({
    data: {
      bookingId: booking2.id,
      action: 'CREATED',
      description: 'Бронирование создано клиентом',
      teamId: testTeam.id,
    }
  })

  console.log('✅ Тестовый салон создан:')
  console.log(`   - Название: ${testTeam.name}`)
  console.log(`   - Номер команды: ${testTeam.teamNumber}`)
  console.log(`   - Slug для записи: ${testTeam.slug}`)
  console.log(`   - Админ: ${teamAdmin.email} / password123`)
  console.log(`   - Мастера: anna@example.com, elena@example.com / password123`)
  console.log(`   - Создано ${services.length} услуг`)
  console.log(`   - Создано ${createdClients.length} клиентов`)
  console.log(`   - Создано 2 тестовых бронирования`)

  console.log('\n🔗 Ссылки:')
  console.log(`   - Главная: http://localhost:3000`)
  console.log(`   - Вход: http://localhost:3000/login`)
  console.log(`   - Админка салона: http://localhost:3000/admin`)
  console.log(`   - Виджет записи: http://localhost:3000/book/${testTeam.slug}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n🎉 База данных успешно заполнена!')
  })
  .catch(async (e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e)
    await prisma.$disconnect()
    process.exit(1)
  })