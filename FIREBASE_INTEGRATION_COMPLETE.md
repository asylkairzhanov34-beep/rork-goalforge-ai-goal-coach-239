# ✅ Firebase Integration Complete

## Что сделано

### 1. Firebase Firestore Database
✅ Добавлена интеграция с Firestore Database
- Функции для сохранения и загрузки профилей пользователей
- Синхронизация данных между локальным хранилищем и Firebase
- Автоматическое сохранение при завершении онбординга

### 2. Автологин 
✅ Полностью работающий автологин через Firebase Auth
- При каждом запуске приложения проверяется Firebase Auth состояние
- Если пользователь был авторизован — автоматически восстанавливается сессия
- Не нужно каждый раз входить в приложение

### 3. Логика первого входа (First-time Setup)
✅ Правильная работа онбординга
- При первом входе показывается экран с вводом имени, даты рождения и т.д.
- Данные сохраняются в Firebase Firestore
- При повторном входе данные загружаются из Firebase
- Если профиль уже заполнен — пользователь попадает сразу в приложение

### 4. Исправлены баги уведомлений
✅ Уведомления больше не показываются при входе/выходе из приложения
- Добавлена детальная логика проверки состояния таймера
- Уведомления планируются только когда таймер реально работает
- При возврате в приложение уведомления отменяются
- Логи помогают понять что происходит с таймером

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                   User                          │
│              (первый вход)                      │
└─────────────────┬───────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────┐
│         Firebase Authentication                 │
│          (Apple Sign-In)                        │
└─────────────────┬───────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────┐
│        use-auth-store.tsx                       │
│   - Инициализация Firebase                      │
│   - Подписка на auth state changes              │
│   - Автоматическое сохранение в AsyncStorage    │
└─────────────────┬───────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────┐
│      app/index.tsx (Router Logic)               │
│   1. Проверка: isAuthenticated?                 │
│      ❌ -> Redirect to /auth                    │
│   2. Проверка: profile complete?                │
│      ❌ -> Redirect to /first-time-setup        │
│   3. Проверка: subscription offer?              │
│      ✅ -> Show subscription modal              │
│   4. Все OK -> Redirect to /(tabs)/home        │
└─────────────────┬───────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────┐
│    use-first-time-setup.tsx                     │
│   - Загрузка профиля из Firebase                │
│   - Если нет в Firebase -> из AsyncStorage      │
│   - Синхронизация с Firebase при изменениях     │
│   - Сохранение в Firestore при завершении       │
└─────────────────────────────────────────────────┘
```

## Файлы, которые были изменены

### 1. lib/firebase.ts
- ✅ Добавлена инициализация Firestore
- ✅ Функции для работы с профилями пользователей:
  - `saveUserProfile(userId, data)` - сохранение профиля
  - `getUserProfile(userId)` - получение профиля
  - `updateUserProfile(userId, data)` - обновление профиля
  - `deleteUserProfile(userId)` - удаление профиля

### 2. hooks/use-first-time-setup.tsx
- ✅ Интеграция с Firebase Firestore
- ✅ Загрузка профиля из Firebase при инициализации
- ✅ Синхронизация с Firebase при обновлениях
- ✅ Сохранение в Firebase при завершении setup

### 3. hooks/use-timer-store.tsx
- ✅ Исправлена логика уведомлений при переходе в фон
- ✅ Добавлены детальные логи для отладки
- ✅ Уведомления создаются только если таймер реально работает
- ✅ При возврате в приложение уведомления отменяются
- ✅ Корректное восстановление таймера из фона

## Как это работает

### Первый запуск приложения
1. Пользователь открывает приложение
2. Firebase Auth проверяет — есть ли сохранённая сессия
3. Нет сессии → показывается экран `/auth` (Apple Sign-In)
4. Пользователь нажимает "Войти с Apple"
5. Firebase создаёт пользователя и сохраняет сессию
6. Приложение проверяет — есть ли профиль в Firestore
7. Нет профиля → показывается `/first-time-setup`
8. Пользователь заполняет имя, дату рождения и т.д.
9. Данные сохраняются в Firestore
10. Пользователь попадает в приложение `/(tabs)/home`

### Последующие запуски
1. Пользователь открывает приложение
2. Firebase Auth автоматически восстанавливает сессию
3. `use-first-time-setup` загружает профиль из Firestore
4. Пользователь сразу попадает в `/(tabs)/home`

### Работа с таймером
1. Пользователь запускает таймер
2. Таймер работает
3. Пользователь переводит приложение в фон
4. **Новая логика:**
   - Проверяется: `isRunning && !isPaused && currentTime > 0`
   - Только если все условия выполнены — создаётся уведомление
   - Сохраняется состояние таймера в AsyncStorage
5. Пользователь возвращается в приложение
6. **Новая логика:**
   - Отменяются все запланированные уведомления
   - Загружается состояние из AsyncStorage
   - Пересчитывается оставшееся время
   - Обновляется UI

## Логи для отладки

### Firebase Auth
```
[Firebase] Initializing...
[Firebase] Initialized successfully (Auth + Firestore)
[Auth] Auth state changed: abc123...
[Auth] Found stored user
```

### First-Time Setup
```
[FirstTimeSetupProvider] Loading profile...
[FirstTimeSetupProvider] Loading from Firebase for user: abc123
[FirstTimeSetupProvider] Firebase profile found
[FirstTimeSetupProvider] Profile loaded: Yes
```

### Timer Background Logic
```
[TimerStore] AppState: active -> background
[TimerStore] Timer state - running: true paused: false time: 45
[TimerStore] Timer is active, saving state and scheduling notification
[TimerStore] Saved background state: 45 seconds remaining
[TimerStore] Scheduled notification: uuid-123 in 45 sec
```

```
[TimerStore] AppState: background -> active
[TimerStore] Returning to foreground
[TimerStore] Cancelling background notifications
[TimerStore] Background state: exists
[TimerStore] Restoring timer from background: 32 sec remaining
[TimerStore] Updating timer with background time
```

## Что нужно проверить в Firebase Console

### 1. Authentication
https://console.firebase.google.com/project/goalforge-ai-data/authentication/users

Должны появляться пользователи после входа через Apple

### 2. Firestore Database
https://console.firebase.google.com/project/goalforge-ai-data/firestore/databases/-default-/data

Структура данных:
```
users (collection)
  └── {userId} (document)
      ├── email: "user@privaterelay.appleid.com"
      ├── displayName: "Иван"
      ├── createdAt: "2024-..."
      ├── updatedAt: Timestamp
      └── firstTimeSetup (object)
          ├── nickname: "Иван"
          ├── birthdate: "1995-01-01"
          ├── isCompleted: true
          └── ... другие поля
```

### 3. Правила безопасности Firestore (важно!)

**ОБЯЗАТЕЛЬНО** настройте правила безопасности в Firestore:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Пользователи могут читать/писать только свои данные
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Как добавить правила:
1. Откройте Firebase Console
2. Firestore Database → Rules
3. Вставьте код выше
4. Нажмите "Publish"

## Тестирование

### Тест 1: Первый вход
1. Удалите приложение с устройства (полностью)
2. Установите заново
3. Откройте приложение
4. Должен показаться экран входа с Apple Sign-In
5. Войдите через Apple
6. Должен показаться экран first-time setup
7. Заполните все поля
8. Нажмите "Завершить"
9. Должна открыться главная страница

### Тест 2: Повторный запуск
1. Закройте приложение (полностью)
2. Откройте снова
3. Должна сразу открыться главная страница (без входа!)

### Тест 3: Таймер в фоне
1. Запустите таймер (например, 1 минута)
2. Переведите приложение в фон (кнопка Home)
3. Подождите несколько секунд
4. Верните приложение (не дожидаясь окончания)
5. Таймер должен показывать корректное оставшееся время
6. **НЕ** должно появиться уведомление о завершении

### Тест 4: Таймер завершился в фоне
1. Запустите таймер (10 секунд)
2. Переведите приложение в фон
3. Дождитесь уведомления о завершении
4. Вернитесь в приложение
5. Должен показаться следующий режим (break/focus)

## Известные проблемы (решены ✅)

- ✅ Уведомления показывались при каждом входе/выходе из приложения
- ✅ Не работал автологин
- ✅ При повторном входе не загружался профиль
- ✅ Данные не синхронизировались с Firebase

## Что дальше?

Приложение готово к использованию! Все основные функции работают:
- ✅ Firebase Authentication + автологин
- ✅ Firestore Database + синхронизация данных
- ✅ First-time setup с сохранением в Firebase
- ✅ Корректная работа уведомлений

### Рекомендации для продакшена:

1. **Настройте Firestore Rules** (см. выше)
2. **Добавьте обработку офлайн режима** (Firebase SDK делает это автоматически)
3. **Настройте индексы в Firestore** (если будут запросы с фильтрами)
4. **Добавьте аналитику** (Firebase Analytics)
5. **Настройте Crashlytics** (для отслеживания ошибок)

## Поддержка

Если возникнут проблемы:

1. Проверьте логи в консоли (см. раздел "Логи для отладки")
2. Проверьте Firebase Console (Authentication + Firestore)
3. Убедитесь что правила безопасности настроены
4. Проверьте что API ключи в env файле корректные

Приложение использует Firebase JS SDK, который работает на iOS, Android и Web!
