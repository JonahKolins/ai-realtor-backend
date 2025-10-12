#!/bin/bash

# Скрипт для остановки всех процессов проекта AI Realtor Backend

echo "🛑 Остановка AI Realtor Backend..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для остановки процессов по имени
stop_processes() {
    local process_name="$1"
    local pids=$(pgrep -f "$process_name" 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Найдены процессы: $process_name${NC}"
        echo "$pids" | while read pid; do
            if [ -n "$pid" ]; then
                echo -e "${YELLOW}Останавливаем процесс $pid ($process_name)${NC}"
                kill -TERM "$pid" 2>/dev/null
                sleep 2
                # Если процесс не остановился, принудительно завершаем
                if kill -0 "$pid" 2>/dev/null; then
                    echo -e "${RED}Принудительно завершаем процесс $pid${NC}"
                    kill -KILL "$pid" 2>/dev/null
                fi
            fi
        done
        echo -e "${GREEN}Процессы $process_name остановлены${NC}"
    else
        echo -e "${GREEN}Процессы $process_name не найдены${NC}"
    fi
}

# Останавливаем различные процессы проекта
echo "🔍 Поиск процессов проекта..."

# NestJS процессы
stop_processes "nest start"
stop_processes "nest start --watch"
stop_processes "nest start --debug"

# Node.js процессы проекта
stop_processes "node.*dist/src/main"
stop_processes "node.*ai-realtor-backend"

# Prisma процессы
stop_processes "prisma studio"
stop_processes "prisma.*migrate"

# Jest тесты
stop_processes "jest"
stop_processes "jest --watch"

# TypeScript компилятор
stop_processes "tsc"
stop_processes "ts-node"

# Дополнительные процессы
stop_processes "nodemon"
stop_processes "ts-node-dev"

# Проверяем порты 3000, 4000, 5432 (PostgreSQL)
echo "🔍 Проверка портов..."

for port in 3000 4000 5432; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Найден процесс на порту $port (PID: $pid)${NC}"
        kill -TERM "$pid" 2>/dev/null
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${RED}Принудительно завершаем процесс на порту $port${NC}"
            kill -KILL "$pid" 2>/dev/null
        fi
        echo -e "${GREEN}Порт $port освобожден${NC}"
    else
        echo -e "${GREEN}Порт $port свободен${NC}"
    fi
done

# Финальная проверка
echo "🔍 Финальная проверка процессов..."
remaining_processes=$(pgrep -f "ai-realtor-backend\|nest\|prisma.*studio" 2>/dev/null)

if [ -n "$remaining_processes" ]; then
    echo -e "${RED}Остались процессы:${NC}"
    echo "$remaining_processes" | while read pid; do
        if [ -n "$pid" ]; then
            ps -p "$pid" -o pid,ppid,cmd 2>/dev/null || true
        fi
    done
    echo -e "${YELLOW}Рекомендуется проверить процессы вручную${NC}"
else
    echo -e "${GREEN}✅ Все процессы проекта остановлены${NC}"
fi

echo "🏁 Остановка завершена"
