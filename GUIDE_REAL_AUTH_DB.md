# Инструкция: Подключение настоящей базы данных и Apple Auth

Эта инструкция поможет перевести приложение с локального хранения данных на настоящий сервер с базой данных PostgreSQL и настроить реальную авторизацию через Apple.

## 1. Выбор и подключение базы данных (PostgreSQL)

Для продакшн-приложения рекомендуем использовать **PostgreSQL**.
Самые удобные облачные провайдеры для Expo/React Native стека:
1. **Supabase** (База данных + Auth + Storage + UI админка).
2. **Neon** (Serverless Postgres, отлично масштабируется).

### Шаг 1.1: Создайте базу данных
1. Зарегистрируйтесь на [Supabase.com](https://supabase.com) или [Neon.tech](https://neon.tech).
2. Создайте новый проект.
3. Скопируйте **Connection String** (URL подключения). Он выглядит так: `postgres://user:pass@host:port/dbname?sslmode=require`.

### Шаг 1.2: Настройка переменных окружения
Добавьте этот URL в ваш `.env` файл (не забудьте добавить его в `.gitignore`, чтобы не слить пароли!):

```bash
DATABASE_URL="ваш_url_из_supabase_или_neon"
```

### Шаг 1.3: Установка библиотек для работы с БД
Мы будем использовать **Drizzle ORM** — это современная и легкая ORM, идеальная для TypeScript.

Выполните в терминале:
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### Шаг 1.4: Настройка схемы данных
Создайте файл `backend/schema.ts`:

```typescript
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique(),
  appleId: text('apple_id').unique(), // ID от Apple
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
  isPremium: boolean('is_premium').default(false),
});
```

### Шаг 1.5: Подключение (backend/db.ts)
Файл уже создан мной (см. `backend/db.ts`). Вам нужно только раскомментировать код после установки библиотек.

## 2. Настройка Apple Authentication (Backend)

Локальная авторизация просто сохраняет данные в телефон. Настоящая авторизация должна отправлять `identityToken` на сервер, сервер проверяет его в Apple, и если всё ок — создает сессию.

### Шаг 2.1: Установка библиотеки верификации
На сервере нужно проверять токен Apple.
```bash
npm install verify-apple-id-token jsonwebtoken
```

### Шаг 2.2: Реализация API маршрута
Я создал заготовку маршрута в `backend/trpc/routes/auth.ts`.
Он принимает `identityToken`, проверяет его и возвращает пользователя.

### Шаг 2.3: Обновление клиента
В `hooks/use-auth-store.tsx` нужно заменить локальное сохранение на вызов API:

```typescript
// Было:
// await saveUser(user);

// Станет:
// const { token, user } = await trpcClient.auth.loginWithApple.mutate({ identityToken, email, fullName });
// await saveSessionToken(token);
```

## 3. Чек-лист для релиза в App Store (Что еще нужно?)

Чтобы приложение пропустили в App Store, вам обязательно нужно:

1. **Apple Developer Account**: Оплаченный аккаунт разработчика ($99/год).
2. **Privacy Policy (Политика конфиденциальности)**:
   - Создайте страницу (можно на Notion или GitHub Pages) с текстом политики.
   - **Важно**: Если используете Apple Auth, вы ОБЯЗАНЫ добавить пункт про удаление данных.
3. **Кнопка "Удалить аккаунт"**:
   - Внутри приложения (обычно в профиле) должна быть кнопка, которая реально удаляет данные пользователя из базы (или ставит пометку на удаление). Без этого Apple отклонит приложение.
4. **Terms of Use (EULA)**: Ссылка на пользовательское соглашение.
5. **Скриншоты**:
   - 6.5 inch (iPhone 11 Pro Max / XS Max / 14 Plus)
   - 5.5 inch (iPhone 8 Plus)
   - iPad (если поддерживается)
6. **Тестирование на IPv6**: Apple проверяет работу в сетях IPv6. Обычно это работает само собой, но убедитесь, что ваш сервер доступен.
7. **Демо-аккаунт**: Если в приложении есть вход по Email, предоставьте Apple логин/пароль для тестов при отправке на проверку.

## 4. Миграции базы данных

Чтобы создать таблицы в реальной базе:

1. Создайте `drizzle.config.ts` в корне:
```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './backend/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

2. Запустите создание миграции:
```bash
npx drizzle-kit generate
```

3. Примените миграцию к базе:
```bash
npx drizzle-kit migrate
```
