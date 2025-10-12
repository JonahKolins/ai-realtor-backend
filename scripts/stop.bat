@echo off
REM Скрипт для остановки всех процессов проекта AI Realtor Backend (Windows)

echo 🛑 Остановка AI Realtor Backend...

REM Остановка процессов по имени
echo 🔍 Поиск процессов проекта...

REM NestJS процессы
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "nest"') do (
    echo Останавливаем процесс %%i
    taskkill /pid %%i /f >nul 2>&1
)

REM Node.js процессы проекта
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "ai-realtor-backend"') do (
    echo Останавливаем процесс %%i
    taskkill /pid %%i /f >nul 2>&1
)

REM Prisma процессы
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "prisma"') do (
    echo Останавливаем процесс %%i
    taskkill /pid %%i /f >nul 2>&1
)

REM Jest тесты
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "jest"') do (
    echo Останавливаем процесс %%i
    taskkill /pid %%i /f >nul 2>&1
)

REM TypeScript компилятор
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "tsc"') do (
    echo Останавливаем процесс %%i
    taskkill /pid %%i /f >nul 2>&1
)

REM Проверка портов
echo 🔍 Проверка портов...

REM Порт 3000
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":3000"') do (
    echo Останавливаем процесс на порту 3000 (PID: %%i)
    taskkill /pid %%i /f >nul 2>&1
)

REM Порт 4000
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":4000"') do (
    echo Останавливаем процесс на порту 4000 (PID: %%i)
    taskkill /pid %%i /f >nul 2>&1
)

REM Порт 5432 (PostgreSQL)
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":5432"') do (
    echo Останавливаем процесс на порту 5432 (PID: %%i)
    taskkill /pid %%i /f >nul 2>&1
)

echo ✅ Все процессы проекта остановлены
echo 🏁 Остановка завершена
pause
