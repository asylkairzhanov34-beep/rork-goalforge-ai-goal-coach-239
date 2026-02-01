# Чек-лист для релиза в App Store

Чтобы приложение было готово к публикации, необходимо выполнить следующие шаги.

## 1. База Данных (Real Database)
Сейчас в приложении настроена структура для PostgreSQL.

1. **Создайте базу данных**:
   - Используйте [Supabase](https://supabase.com) или [Neon](https://neon.tech).
   - Создайте новый проект.
   - Получите строку подключения (`DATABASE_URL`), например: `postgres://user:pass@host:5432/db?sslmode=require`.

2. **Настройте переменные окружения**:
   - Добавьте `DATABASE_URL` в `.env` файл на сервере (backend) и локально.

3. **Миграции**:
   - Установите зависимости: `npm install drizzle-orm postgres`
   - Установите dev-зависимость: `npm install -D drizzle-kit`
   - Запустите миграцию, чтобы создать таблицы: `npx drizzle-kit push`

## 2. Аутентификация Apple (Sign in with Apple)
Реализована базовая логика, но для безопасности нужно включить проверку токена на сервере.

1. **Backend**:
   - Установите библиотеку: `npm install verify-apple-id-token`.
   - Раскомментируйте код верификации в `backend/trpc/routes/auth.ts`.
   - Убедитесь, что `clientId` совпадает с вашим Bundle ID (`app.personalized-ai-goal-coach`).

2. **Apple Developer Account**:
   - Включите "Sign In with Apple" в Identifiers > App IDs для вашего приложения.
   - Если вы используете Email сервис, настройте Relay Email.

## 3. Требования App Store Review Guidelines

### 3.1. Удаление аккаунта
**Сделано**: В профиль добавлена кнопка "Удалить аккаунт".
**Важно**: Убедитесь, что эта кнопка реально удаляет данные пользователя из БД (раскомментируйте вызов API в `profile.tsx` и `auth.ts`).

### 3.2. Пользовательское соглашение (EULA) и Политика конфиденциальности
- В `AuthScreen.tsx` и в настройках должны быть реальные ссылки.
- Создайте страницу с Privacy Policy и Terms of Use (можно использовать Notion или GitHub Pages).
- Apple требует стандартное EULA или своё. Обычно достаточно добавить ссылку на Apple's standard EULA в App Store Connect, но внутри приложения тоже стоит упомянуть.

### 3.3. Покупки (In-App Purchases)
- У вас используется RevenueCat.
- Убедитесь, что есть кнопка "Restore Purchases" (Восстановить покупки) на экране пейволла. **Это обязательно**.
- Убедитесь, что есть ссылки на Privacy Policy и Terms of Use на экране покупки.

### 3.4. iPad Support
- В `app.json` стоит `"supportsTablet": true`. Убедитесь, что UI не ломается на iPad (симулятор).

## 4. Технические настройки

### 4.1. Иконки и сплеш-скрины
- Проверьте `assets/images/adaptive-icon.png`, `icon.png`, `splash-icon.png`. Они должны быть финальными и качественными.

### 4.2. Разрешения (Permissions)
- В `app.json` прописаны `NSMicrophoneUsageDescription`, `NSFaceIDUsageDescription`.
- Убедитесь, что тексты объясняют *зачем* это нужно (Apple отклонит, если написано просто "Need access").
- Пример: "This app uses the microphone to let you talk to your AI coach."

## 5. Тестирование (TestFlight)
Перед отправкой на проверку:
1. Сделайте билд: `eas build --platform ios`.
2. Загрузите в TestFlight.
3. Протестируйте:
   - Вход через Apple (на реальном устройстве).
   - Покупку (в Sandbox environment).
   - Удаление аккаунта.
   - Работу без интернета (приложение не должно падать, должно показывать ошибку).

## 6. Что еще не хватает в коде сейчас?

1. **Реальный вызов API удаления**: В `profile.tsx` закомментирован вызов `trpcClient.auth.deleteAccount`. Нужно раскомментировать после настройки БД.
2. **Обработка ошибок сети**: Добавьте `Try/Catch` и `Alert` на действия, зависящие от сети (сохранение цели, чат), если их нет.
3. **Восстановление покупок**: Проверьте, есть ли кнопка "Restore" в `SubscriptionScreen.tsx` или `PaywallModal.tsx`.

## Резюме
Приложение близко к релизу. Основные пробелы — это **подключение реальной БД** и **верификация токена Apple**. Без этого Apple Auth небезопасен, а данные не сохраняются между устройствами.
