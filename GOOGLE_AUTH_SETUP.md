# 📱 Настройка Google Sign In

## ✅ Текущий статус

Ваши Client IDs:
- **iOS Client ID**: `769966215817-4046hqojj6j5o395tk9n50pq6b19102t.apps.googleusercontent.com` ✅
- **Android/Web Client ID**: `769966215817-92j42af735k7005djr2aes0vuvs1m9h1.apps.googleusercontent.com` ✅

Все Client IDs настроены в файле `.env`.

## 🔑 Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш существующий проект (или создайте новый)
3. Убедитесь, что включена **Google+ API** или **Google Identity Services API**:
   - В меню выберите "APIs & Services" → "Library"
   - Найдите "Google+ API" или "Google Identity Services" и нажмите "Enable"

## 🔐 Шаг 2: Создание OAuth 2.0 Client ID

### Для Android:

1. В Google Cloud Console перейдите: "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "OAuth client ID"
3. Выберите Application type: **Android**
4. Заполните:
   - **Name**: GoalForge Android
   - **Package name**: `app.rork.personalized-ai-goal-coach` (из вашего app.json)
   - **SHA-1**: получите выполнив команду:
   ```bash
   # Для macOS/Linux:
   keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey
   # Пароль по умолчанию: android
   
   # Для Windows:
   keytool -keystore "%USERPROFILE%\.android\debug.keystore" -list -v -alias androiddebugkey
   ```
5. Скопируйте созданный **Client ID**
6. **Обновите в файле `.env`**: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=новый-android-client-id`

### Для iOS: ✅ УЖЕ НАСТРОЕНО

iOS Client ID уже создан и добавлен в `.env`:
```
769966215817-4046hqojj6j5o395tk9n50pq6b19102t.apps.googleusercontent.com
```

Если нужно создать новый:
1. Нажмите "Create Credentials" → "OAuth client ID"
2. Выберите Application type: **iOS**
3. Заполните:
   - **Name**: GoalForge iOS
   - **Bundle ID**: `app.rork.personalized-ai-goal-coach` (из вашего app.json)
4. Скопируйте созданный **Client ID**
5. **Замените в файле `.env`**: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=новый-ios-client-id`

### Для Web (уже настроен):

Ваш Web Client ID уже создан:
```
769966215817-92j42af735k7005djr2aes0vuvs1m9h1.apps.googleusercontent.com
```

**ВАЖНО! Для Web Client ID нужно настроить Redirect URIs:**

1. В Google Cloud Console откройте Web Client ID (`769966215817-92j42af735k7005djr2aes0vuvs1m9h1`)
2. Нажмите "EDIT" (редактировать)
3. Найдите секцию **"Authorized redirect URIs"**
4. Добавьте следующие URIs (ВСЕ обязательны для работы):
   ```
   https://auth.expo.io/@anonymous/personalized-ai-goal-coach
   https://rork.com
   http://localhost:19006
   http://localhost:8081
   ```

5. Нажмите "SAVE" (сохранить)
6. Подождите 5-10 минут для применения изменений

**Примечание:** Если вы используете Expo account, замените `@anonymous` на `@ваш-expo-username`

## ⚙️ Шаг 3: Добавление переменных окружения

Создайте файл `.env` в корне проекта (если его нет) и добавьте:

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

**⚠️ ВАЖНО:** Замените значения на реальные Client ID из Google Cloud Console!

## 📝 Шаг 4: Обновление app.json

Добавьте схему для iOS в `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.goalforge",
      "scheme": "com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID"
    },
    "android": {
      "package": "com.yourcompany.goalforge"
    }
  }
}
```

Где `YOUR_REVERSED_CLIENT_ID` - это ваш iOS Client ID, но в обратном порядке.
Например, если Client ID: `123456789-abc.apps.googleusercontent.com`,
то scheme: `com.googleusercontent.apps.123456789-abc`

## 🧪 Шаг 5: Тестирование

### ✅ На Web (работает сейчас):
Google Sign In должен работать в web preview с текущим Web Client ID.

### ⚠️ На iOS (требует iOS Client ID):
1. **Сначала создайте iOS Client ID** (см. Шаг 2)
2. **Обновите .env файл** с новым iOS Client ID
3. **Перезапустите приложение**
4. Google Sign In НЕ работает в Expo Go - нужен development build:
   ```bash
   npx expo run:ios
   # или через EAS:
   eas build --profile development --platform ios
   ```

### ⚠️ На Android (требует Android Client ID + SHA-1):
1. **Сначала создайте Android Client ID** с SHA-1 (см. Шаг 2)
2. **Обновите .env файл** с новым Android Client ID
3. **Перезапустите приложение**
4. Google Sign In НЕ работает в Expo Go - нужен development build:
   ```bash
   npx expo run:android
   # или через EAS:
   eas build --profile development --platform android
   ```

## 🔍 Проверка работы

После настройки:
1. Запустите приложение
2. На экране авторизации нажмите "Войти с Google"
3. Появится окно выбора Google аккаунта
4. После выбора аккаунта вы будете авторизованы

## ❌ Возможные ошибки

### "Error: Client Id property `iosClientId` must be defined" ⚠️ ТЕКУЩАЯ ОШИБКА
- Это означает, что вы пытаетесь использовать Google Sign In на iOS без iOS Client ID
- **Решение**: Создайте iOS Client ID в Google Cloud Console (см. Шаг 2)
- После создания добавьте его в `.env` и перезапустите приложение

### "Error: No client ID provided"
- Проверьте, что файл `.env` создан и содержит все Client ID
- Перезапустите приложение после добавления `.env`

### "Error: redirect_uri_mismatch" ⚠️ ТЕКУЩАЯ ОШИБКА

Это означает, что redirect URI не настроен в Google Cloud Console.

**Решение:**
1. Откройте [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Найдите Web Client ID: `769966215817-92j42af735k7005djr2aes0vuvs1m9h1`
3. Нажмите на него для редактирования
4. В секции **"Authorized redirect URIs"** добавьте:
   - `https://auth.expo.io/@anonymous/personalized-ai-goal-coach`
   - `https://rork.com`
   - `http://localhost:19006`
   - `http://localhost:8081`
5. Сохраните изменения
6. Подождите 5-10 минут
7. Перезапустите приложение и попробуйте снова

### "The app signature doesn't match"
- Для Android: проверьте, что SHA-1 в Google Console совпадает с вашим debug keystore
- Для production билдов нужен отдельный OAuth Client ID с SHA-1 от production keystore

### "Sign in with Google temporarily disabled for this app"
- Добавьте тестовых пользователей в OAuth consent screen
- Или опубликуйте приложение (перейдите в production mode)

## 📚 Дополнительные ресурсы

- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [Google OAuth 2.0 Setup](https://support.google.com/cloud/answer/6158849)
- [expo-auth-session Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
