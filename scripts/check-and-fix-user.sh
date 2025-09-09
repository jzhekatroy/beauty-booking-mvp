#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EMAIL=$1

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Использование: $0 <email>${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Проверяем пользователя: $EMAIL${NC}"
echo ""

# Проверяем Docker Compose
echo -e "${BLUE}📋 Проверяем Docker Compose...${NC}"
if ! docker compose ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose не работает! Пожалуйста, запустите его.${NC}"
    exit 1
fi

# Проверяем статус контейнеров
echo -e "${BLUE}📊 Проверяем статус контейнеров...${NC}"
docker compose ps

# Проверяем пользователя
echo -e "${BLUE}🔍 Проверяем данные пользователя...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
SELECT 
    id,
    email,
    role,
    \"firstName\",
    \"lastName\",
    \"teamId\",
    \"createdAt\",
    \"updatedAt\"
FROM users 
WHERE email = '$EMAIL';
"

# Проверяем команду пользователя
echo -e "${BLUE}🏢 Проверяем команду пользователя...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
SELECT 
    t.id,
    t.name,
    t.\"teamNumber\",
    t.slug
FROM teams t
JOIN users u ON u.\"teamId\" = t.id
WHERE u.email = '$EMAIL';
"

echo -e "${BLUE}🔧 Исправляем пользователя...${NC}"

# Создаем системную команду если не существует
echo -e "${BLUE}📝 Создаем системную команду...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO teams (id, \"teamNumber\", name, slug, \"contactPerson\", email, \"masterLimit\", \"createdAt\", \"updatedAt\")
SELECT 'system-team-001', 'B0000001', 'Система управления', 'system', 'Супер Админ', 'admin@beauty-booking.com', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE \"teamNumber\" = 'B0000001');
"

# Получаем ID системной команды
TEAM_ID=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT id FROM teams WHERE \"teamNumber\" = 'B0000001' LIMIT 1;" | tr -d ' \n')
echo -e "${GREEN}✅ ID системной команды: $TEAM_ID${NC}"

# Обновляем пользователя - делаем его суперадмином
echo -e "${BLUE}👤 Обновляем пользователя...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
UPDATE users 
SET 
    role = 'SUPER_ADMIN',
    \"teamId\" = '$TEAM_ID',
    \"updatedAt\" = NOW()
WHERE email = '$EMAIL';
"

# Проверяем результат
echo -e "${BLUE}✅ Проверяем результат...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
SELECT 
    id,
    email,
    role,
    \"firstName\",
    \"lastName\",
    \"teamId\"
FROM users 
WHERE email = '$EMAIL';
"

echo -e "${GREEN}🎉 Готово!${NC}"
echo -e "${YELLOW}Теперь попробуйте войти:${NC}"
echo -e "${YELLOW}   Email: $EMAIL${NC}"
echo -e "${YELLOW}   Пароль: rootpasswd${NC}"
echo -e "${YELLOW}   URL: https://test.2minutes.ru/login${NC}"
