# Настройка подписок Apple через RevenueCat

## Шаг 1: Настройка App Store Connect

### 1.1 Создайте приложение
1. Откройте https://appstoreconnect.apple.com
2. Войдите с вашим Apple Developer аккаунтом
3. Перейдите в "My Apps" → "+" → "New App"
4. Заполните информацию:
   - **Platform**: iOS
   - **Name**: Personalized AI Goal Coach
   - **Primary Language**: Russian (или English)
   - **Bundle ID**: `app.personalized-ai-goal-coach`
   - **SKU**: `personalizedaigoalcoach001`

### 1.2 Создайте подписки
1. Откройте ваше приложение в App Store Connect
2. Перейдите в раздел "Subscriptions" (в левом меню)
3. Нажмите "+" → "Create Subscription Group"
4. Назовите группу: "Premium Access"

#### Месячная подписка ($9.99)
1. Нажмите "+" рядом с группой подписок
2. Заполните:
   - **Reference Name**: Premium Monthly
   - **Product ID**: `premium_monthly` ⚠️ **ВАЖНО: именно такой ID**
   - **Subscription Duration**: 1 Month
3. Нажмите "Create"
4. В разделе "Subscription Prices":
   - Нажмите "Add Subscription Pricing"
   - Выберите страны (например, United States)
   - Цена: **$9.99**
   - Нажмите "Next" → "Confirm"
5. Заполните обязательные поля:
   - **Subscription Display Name**: Premium Monthly
   - **Description**: Full access to all premium features for 1 month
6. Нажмите "Save"

#### Годовая подписка ($79.00)
1. Нажмите "+" рядом с группой подписок
2. Заполните:
   - **Reference Name**: Premium Annual
   - **Product ID**: `premium_yearly` ⚠️ **ВАЖНО: именно такой ID**
   - **Subscription Duration**: 1 Year
3. Нажмите "Create"
4. В разделе "Subscription Prices":
   - Нажмите "Add Subscription Pricing"
   - Выберите страны (например, United States)
   - Цена: **$79.00**
   - Нажмите "Next" → "Confirm"
5. Заполните обязательные поля:
   - **Subscription Display Name**: Premium Annual
   - **Description**: Full access to all premium features for 1 year (save $40.88)
6. Нажмите "Save"

### 1.3 Отправьте подписки на ревью
⚠️ **ВАЖНО**: Подписки должны быть одобрены Apple перед использованием.
1. Убедитесь, что все обязательные поля заполнены
2. Нажмите "Submit for Review" для каждой подписки
3. Одобрение обычно занимает 24-48 часов

## Шаг 2: Настройка RevenueCat

### 2.1 Создайте аккаунт
1. Откройте https://www.revenuecat.com
2. Нажмите "Sign Up" и создайте бесплатный аккаунт
3. Подтвердите email

### 2.2 Создайте проект
1. После входа нажмите "Create new project"
2. Введите название: "Personalized AI Goal Coach"
3. Нажмите "Create"

### 2.3 Добавьте iOS приложение
1. В Dashboard нажмите "Add app"
2. Выберите платформу: **iOS**
3. Заполните:
   - **App name**: Personalized AI Goal Coach
   - **Bundle ID**: `app.personalized-ai-goal-coach`
4. Нажмите "Save"

### 2.4 Подключите App Store Connect API
1. В настройках вашего iOS приложения найдите "Service Credentials"
2. Нажмите "Add App Store Connect credentials"

#### Создание In-App Purchase Key:
1. Откройте https://appstoreconnect.apple.com
2. Перейдите в "Users and Access" (в верхнем меню)
3. Перейдите на вкладку "Integrations" → "In-App Purchase"
4. Нажмите "+" для создания нового ключа
5. Назовите ключ: "RevenueCat Key"
6. Нажмите "Generate"
7. **ВАЖНО**: 
   - Скачайте `.p8` файл (он показывается только один раз!)
   - Скопируйте **Key ID** (10 символов)
   - Скопируйте **Issuer ID** (UUID)

#### Добавление ключа в RevenueCat:
1. Вернитесь в RevenueCat Dashboard
2. В разделе "Service Credentials":
   - Загрузите `.p8` файл
   - Введите **Key ID**
   - Введите **Issuer ID**
3. Нажмите "Save"

### 2.5 Создайте продукты в RevenueCat
1. В RevenueCat Dashboard перейдите в "Products"
2. Нажмите "New" → "Product"

#### Месячная подписка:
- **Identifier**: `premium_monthly` (точно так же, как в App Store Connect!)
- **Type**: Subscription
- **Store**: App Store
- Нажмите "Add"

#### Годовая подписка:
- **Identifier**: `premium_yearly` (точно так же, как в App Store Connect!)
- **Type**: Subscription
- **Store**: App Store
- Нажмите "Add"

### 2.6 Создайте Offering
1. Перейдите в "Offerings"
2. Нажмите "New offering"
3. Заполните:
   - **Identifier**: `default` (это важно!)
   - **Description**: Default Premium Offering
4. Нажмите "Create"
5. В созданном Offering нажмите "Add package"

#### Добавьте месячный пакет:
- **Identifier**: `$rc_monthly` (RevenueCat автоматически добавит префикс)
- **Product**: Выберите `premium_monthly`
- **Duration**: Monthly
- Нажмите "Add"

#### Добавьте годовой пакет:
- **Identifier**: `$rc_annual` (RevenueCat автоматически добавит префикс)
- **Product**: Выберите `premium_yearly`
- **Duration**: Annual
- Нажмите "Add"

### 2.7 Создайте Entitlement
1. Перейдите в "Entitlements"
2. Нажмите "New entitlement"
3. Заполните:
   - **Identifier**: `premium`
   - **Display name**: Premium Access
4. Нажмите "Create"
5. В разделе "Products" добавьте оба продукта:
   - `premium_monthly`
   - `premium_yearly`
6. Нажмите "Save"

### 2.8 Получите API ключи
1. В RevenueCat Dashboard перейдите в настройки проекта
2. Откройте вкладку "API keys"
3. Найдите секцию "App specific public keys"
4. Скопируйте **iOS SDK key** (начинается с `appl_...`)

## Шаг 3: Настройка в коде

### 3.1 Добавьте RevenueCat API ключ
Откройте файл `env` в корне проекта и обновите:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_ваш_ключ_здесь
```

Замените `appl_ваш_ключ_здесь` на ваш реальный iOS SDK key из RevenueCat.

## Шаг 4: Тестирование

### 4.1 Создайте Sandbox тестера
1. Откройте https://appstoreconnect.apple.com
2. Перейдите в "Users and Access"
3. Перейдите на вкладку "Sandbox"
4. Нажмите "+"
5. Создайте тестового пользователя:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: любой несуществующий email (например, `test123@example.com`)
   - **Password**: создайте надежный пароль
   - **Country or Region**: United States (или ваша страна)
   - **App Store Territory**: United States
6. Нажмите "Save"

### 4.2 Соберите приложение для тестирования

⚠️ **ВАЖНО**: Покупки НЕ работают в:
- Expo Go
- Web версии (Rork preview)
- Симуляторе iOS

Вам нужно собрать development build:

```bash
# Установите EAS CLI (если еще не установлен)
npm install -g eas-cli

# Войдите в Expo аккаунт
eas login

# Создайте development build для iOS
eas build --profile development --platform ios
```

После сборки:
1. Скачайте `.ipa` файл
2. Установите на физическое iOS устройство через:
   - Xcode
   - Или используйте сервисы типа Diawi/TestFlight

### 4.3 Тестирование покупок

1. **На устройстве iOS**:
   - Откройте Настройки → App Store
   - Убедитесь, что вы НЕ вошли в свой основной Apple ID
   - Если вошли - выйдите

2. **В приложении**:
   - Откройте приложение на физическом iOS устройстве
   - Перейдите в раздел подписки (экран Premium)
   - Выберите план ($9.99 или $79.00)
   - Нажмите "Продолжить"

3. **При оплате**:
   - iOS попросит войти в App Store
   - Войдите с данными **Sandbox тестера** (НЕ ваш основной Apple ID!)
   - Подтвердите покупку
   - **Деньги НЕ будут списаны** - это тестовая среда

4. **Проверка**:
   - После успешной покупки вы увидите сообщение "Подписка активирована"
   - Статус Premium должен активироваться
   - Проверьте в RevenueCat Dashboard → Customers - там должен появиться ваш тестер

## Шаг 5: Проверка статуса в коде

Приложение уже настроено для проверки статуса подписки. Используйте хук `useSubscription`:

```typescript
import { useSubscription } from '@/hooks/use-subscription-store';

function YourComponent() {
  const { isPremium, status, packages } = useSubscription();

  if (!isPremium) {
    return <Text>Нужна подписка Premium</Text>;
  }

  return <Text>У вас есть Premium!</Text>;
}
```

## Важные замечания

### Тестирование
- ✅ Работает на физическом iOS устройстве с development build
- ✅ Sandbox тестеры не платят реальные деньги
- ❌ НЕ работает в Expo Go
- ❌ НЕ работает в web preview
- ❌ НЕ работает в симуляторе iOS

### Product IDs
⚠️ **КРИТИЧЕСКИ ВАЖНО**: Product IDs должны совпадать везде:
- App Store Connect: `premium_monthly`, `premium_yearly`
- RevenueCat Products: `premium_monthly`, `premium_yearly`
- Код: использует их автоматически

### Цены
- Месячная: **$9.99**
- Годовая: **$79.00** (экономия $40.88)
- Цены настраиваются в App Store Connect и автоматически синхронизируются

### Режимы работы
1. **Web/Preview**: Использует mock-подписки (симуляция)
2. **Development (без API key)**: Использует mock-подписки
3. **Development (с API key)**: Работает с RevenueCat Sandbox
4. **Production**: Работает с реальными платежами

## Troubleshooting

### Проблема: "No packages available"
**Решение**:
1. Проверьте, что Product IDs совпадают в App Store Connect и RevenueCat
2. Убедитесь, что подписки одобрены в App Store Connect
3. Проверьте, что Offering называется `default`
4. Проверьте логи консоли на ошибки

### Проблема: "Purchase failed"
**Решение**:
1. Убедитесь, что используете Sandbox тестера
2. Выйдите из основного Apple ID в настройках устройства
3. Проверьте, что подписки одобрены Apple
4. Проверьте подключение к интернету

### Проблема: "RevenueCat not initialized"
**Решение**:
1. Проверьте, что API key добавлен в файл `env`
2. Проверьте, что API key начинается с `appl_`
3. Перезапустите приложение

## Полезные ссылки

- **RevenueCat Dashboard**: https://app.revenuecat.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **RevenueCat Docs**: https://docs.revenuecat.com/docs/ios
- **Expo + RevenueCat**: https://docs.revenuecat.com/docs/expo

## Поддержка

Если возникли проблемы:
1. Проверьте логи в консоли приложения
2. Проверьте RevenueCat Dashboard → Customer
3. Убедитесь, что все Product IDs совпадают
4. Убедитесь, что используете физическое устройство
5. Проверьте, что подписки одобрены в App Store Connect
