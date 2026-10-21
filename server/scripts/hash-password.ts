import { hashPassword } from '../src/services/password.js';

const password = process.argv[2];

if (!password) {
  console.error('Использование: npm run hash-password -- "ваш_пароль"');
  console.error('Результат вставьте в .env как ADMIN_PASSWORD_HASH=<строка>');
  process.exit(1);
}

if (password.length < 8) {
  console.warn('Предупреждение: пароль короче 8 символов — настоятельно рекомендуется использовать длинный пароль.');
}

console.log(hashPassword(password));
