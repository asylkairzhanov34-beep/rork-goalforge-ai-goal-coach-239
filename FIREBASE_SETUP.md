# Настройка Firebase для Apple Sign-In

## Шаг 1: Создание проекта Firebase

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Нажмите **"Добавить проект"**
3. Введите название проекта (например, "MyApp")
4. Google Analytics можно отключить (необязательно)
5. Нажмите **"Создать проект"**

## Шаг 2: Добавление iOS приложения

1. В консоли Firebase нажмите иконку iOS
2. Введите **Bundle ID** вашего приложения (например: `com.yourname.yourapp`)
   - Этот ID должен совпадать с тем, что указан в Apple Developer Console
3. Введите название приложения (опционально)
4. Нажмите **"Зарегистрировать приложение"**
5. Пропустите шаги с `GoogleService-Info.plist` (нам он не нужен для JS SDK)

## Шаг 3: Получение конфигурации Firebase

1. В Firebase Console перейдите в **Настройки проекта** (шестерёнка)
2. Прокрутите вниз до раздела **"Ваши приложения"**
3. Нажмите на **Web app** (иконка `</>`), если его нет — добавьте
4. Скопируйте значения из `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",           // <- EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain: "xxx.firebaseapp.com",  // <- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "your-project-id",       // <- EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "xxx.appspot.com",   // <- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",     // <- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123:web:abc..."           // <- EXPO_PUBLIC_FIREBASE_APP_ID
};
```

## Шаг 4: Включение Apple Sign-In в Firebase

1. В Firebase Console перейдите в **Authentication** → **Sign-in method**
2. Нажмите **"Добавить нового поставщика"**
3. Выберите **Apple**
4. Включите тумблер
5. Заполните поля:
   - **Services ID**: ваш Apple Services ID (см. Шаг 5)
   - **Apple Team ID**: найдите в [Apple Developer](https://developer.apple.com/account) → Membership
   - **Key ID**: ID ключа из Шаг 6
   - **Private Key**: содержимое файла .p8 из Шаг 6
6. Скопируйте **Callback URL** — он понадобится в Apple Developer Console

## Шаг 5: Настройка Apple Developer Console

### 5.1 Создание App ID
1. Перейдите в [Apple Developer](https://developer.apple.com/account/resources/identifiers/list)
2. Нажмите **"+"** → **App IDs** → **Continue**
3. Выберите **App** → **Continue**
4. Заполните:
   - Description: название вашего приложения
   - Bundle ID: Explicit → введите ваш Bundle ID (например: `com.yourname.yourapp`)
5. В разделе **Capabilities** включите **Sign In with Apple**
6. Нажмите **Continue** → **Register**

### 5.2 Создание Services ID
1. В разделе Identifiers нажмите **"+"**
2. Выберите **Services IDs** → **Continue**
3. Заполните:
   - Description: название (например: "MyApp Sign In")
   - Identifier: уникальный ID (например: `com.yourname.yourapp.signin`)
4. Нажмите **Continue** → **Register**
5. Найдите созданный Services ID и нажмите на него
6. Включите **Sign In with Apple** → нажмите **Configure**
7. Выберите ваш Primary App ID
8. В **Website URLs** добавьте:
   - **Domains**: `your-project-id.firebaseapp.com`
   - **Return URLs**: Callback URL из Firebase (из Шага 4)
9. Нажмите **Save** → **Continue** → **Save**

### 5.3 Создание Key для Sign In with Apple
1. Перейдите в [Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Нажмите **"+"**
3. Введите название ключа
4. Включите **Sign In with Apple** → нажмите **Configure**
5. Выберите ваш Primary App ID → **Save**
6. Нажмите **Continue** → **Register**
7. **ВАЖНО**: Скачайте файл `.p8` — его можно скачать только один раз!
8. Запомните **Key ID**

## Шаг 6: Добавление переменных окружения в Rork

В настройках проекта Rork добавьте следующие переменные:

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Шаг 7: Проверка настройки

1. Откройте приложение на iOS устройстве
2. На экране авторизации нажмите **"Тест Firebase"**
3. Должно появиться: `✅ Firebase готов`
4. Нажмите **"Войти с Apple"**

## Возможные ошибки

### "auth/operation-not-allowed"
- Apple Sign-In не включён в Firebase Authentication
- Проверьте Шаг 4

### "auth/invalid-credential"
- Неверные настройки в Apple Developer Console
- Проверьте Callback URL в Services ID

### "Firebase config missing"
- Не все переменные окружения добавлены
- Проверьте Шаг 6

### Авторизация отменяется без ошибки
- Проверьте Bundle ID — он должен совпадать везде:
  - app.json
  - Apple App ID
  - Firebase iOS app

## Тестирование

- Apple Sign-In работает только на **реальном iOS устройст��е**
- В симуляторе и на веб он недоступен
- Для тестов используйте TestFlight или Expo Go на реальном iPhone/iPad

## Важные ссылки

- [Firebase Console](https://console.firebase.google.com/)
- [Apple Developer](https://developer.apple.com/)
- [Firebase Apple Auth Docs](https://firebase.google.com/docs/auth/ios/apple)
