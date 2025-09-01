#!/usr/bin/env node

// Проверка переменных окружения перед запуском
const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV'
];

const optionalEnvVars = [
  'PORT',
  'API_PREFIX', 
  'CORS_ORIGIN',
  'APP_VERSION',
  'FEATURES_LISTINGS'
];

console.log('🔍 Проверка переменных окружения...\n');

let hasErrors = false;

// Проверяем обязательные переменные
console.log('📋 Обязательные переменные:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ ${envVar}: НЕ НАЙДЕНА`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: ${envVar === 'DATABASE_URL' ? '***скрыто***' : value}`);
  }
});

// Проверяем опциональные переменные
console.log('\n🔧 Опциональные переменные:');
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value}`);
  } else {
    console.log(`⚠️  ${envVar}: используется значение по умолчанию`);
  }
});

if (hasErrors) {
  console.log('\n❌ Ошибка: Не все обязательные переменные окружения настроены!');
  console.log('\n📋 Инструкции:');
  console.log('1. Убедитесь, что PostgreSQL база добавлена в Railway проект');
  console.log('2. Проверьте Variables секцию в Railway dashboard');
  console.log('3. DATABASE_URL должна быть создана автоматически');
  process.exit(1);
} else {
  console.log('\n✅ Все переменные окружения настроены корректно!');
  process.exit(0);
}
