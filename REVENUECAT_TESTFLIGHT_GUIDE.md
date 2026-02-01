# RevenueCat + TestFlight Testing Guide

## Требования

1. **Development Build** - RevenueCat НЕ работает в Expo Go. Нужен development build или production build.
2. **Apple Developer Account** с активной программой ($99/год)
3. **App Store Connect** с настроенным приложением
4. **RevenueCat Account** с настроенным проектом

---

## Шаг 1: Настройка RevenueCat Dashboard

### 1.1 Создание проекта
1. Зайдите на [app.revenuecat.com](https://app.revenuecat.com)
2. Создайте новый проект
3. Добавьте iOS App:
   - **App name**: Ваше название приложения
   - **App Store Connect App-Specific Shared Secret**: Получите в App Store Connect → Your App → App Information → App-Specific Shared Secret

### 1.2 Получение API Key
1. В RevenueCat Dashboard: Project Settings → API Keys
2. Скопируйте **Apple API Key** (начинается с `appl_`)
3. Добавьте в файл `env`:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_key_here
```

### 1.3 Настройка Products
1. **Products** → Add New Product
2. Добавьте Product ID точно как в App Store Connect (например: `premium_monthly`, `premium_yearly`)

### 1.4 Настройка Entitlements
1. **Entitlements** → Add New Entitlement
2. Создайте entitlement с ID `premium`
3. Привяжите к нему ваши products

### 1.5 Настройка Offerings
1. **Offerings** → Create New Offering
2. Создайте offering с ID `default`
3. Добавьте packages:
   - `$rc_monthly` → ваш месячный продукт
   - `$rc_annual` → ваш годовой продукт

---

## Шаг 2: Настройка App Store Connect

### 2.1 Создание Subscriptions
1. App Store Connect → Your App → Subscriptions
2. Создайте Subscription Group
3. Добавьте subscriptions:
   - **Monthly** с Product ID: `premium_monthly`
   - **Yearly** с Product ID: `premium_yearly`

### 2.2 Настройка цен
1. Для каждой подписки установите цены
2. Добавьте локализации (названия, описания)

### 2.3 Server-to-Server Notifications
1. App Store Connect → App → App Information
2. В разделе "App Store Server Notifications" добавьте URL:
```
https://api.revenuecat.com/v1/incoming-webhooks/apple-app-store
```

---

## Шаг 3: Sandbox Testing

### 3.1 Создание Sandbox Tester
1. App Store Connect → Users and Access → Sandbox → Testers
2. Создайте тестовый аккаунт с уникальным email

### 3.2 Настройка устройства
1. На iPhone: Settings → App Store → Sandbox Account
2. Войдите с sandbox tester email

---

## Шаг 4: Build для TestFlight

### 4.1 Создание Development Build (EAS)
```bash
# Установите EAS CLI
npm install -g eas-cli

# Войдите в Expo аккаунт
eas login

# Создайте eas.json если нет
eas build:configure

# Создайте iOS build
eas build --platform ios --profile preview
```

### 4.2 eas.json конфигурация
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 4.3 Upload в TestFlight
```bash
# Production build для TestFlight
eas build --platform ios --profile production

# После успешного build - отправка в App Store Connect
eas submit --platform ios
```

---

## Шаг 5: Тестирование

### 5.1 Установка через TestFlight
1. После обработки build в App Store Connect
2. Добавьте тестеров в TestFlight
3. Установите приложение через TestFlight app

### 5.2 Тестирование покупок
1. Откройте приложение
2. Перейдите на экран подписки
3. При покупке появится диалог App Store
4. Войдите с Sandbox Tester аккаунтом
5. Подтвердите покупку (деньги не списываются)

### 5.3 Проверка в RevenueCat
1. RevenueCat Dashboard → Customers
2. Найдите вашего пользователя по app_user_id
3. Проверьте активные subscriptions и entitlements

---

## Debugging

### Логи в приложении
Код автоматически выводит логи:
- `[RevenueCat] Module loaded successfully` - модуль загружен
- `[RevenueCat] Configuration successful` - успешная конфигурация
- `[RevenueCat] Offerings fetched: default` - offerings получены
- `[RevenueCat] Purchase successful` - покупка успешна

### Общие проблемы

**1. "Module not available"**
- Проверьте что используете development/production build, не Expo Go

**2. "No API key for platform"**
- Убедитесь что `EXPO_PUBLIC_REVENUECAT_IOS_KEY` установлен в env

**3. "No offerings available"**
- Проверьте настройку Offerings в RevenueCat Dashboard
- Убедитесь что Products привязаны к Entitlements и Offerings

**4. Покупка не проходит**
- Убедитесь что используете Sandbox Tester аккаунт
- Проверьте что подписки в App Store Connect в статусе "Ready to Submit"

---

## Чеклист перед релизом

- [ ] API Key в env файле
- [ ] Products созданы в App Store Connect
- [ ] Products добавлены в RevenueCat
- [ ] Entitlement `premium` настроен
- [ ] Offering `default` настроен с packages
- [ ] Server-to-Server Notifications настроены
- [ ] Тестирование в Sandbox успешно
- [ ] TestFlight тестирование успешно

---

## Важно!

1. **Sandbox vs Production**: В sandbox подписки автоматически продлеваются быстрее (например, месячная каждые 5 минут)

2. **App Store Review**: При отправке на review убедитесь что подписки в статусе "Ready to Submit"

3. **Pricing**: Цены в App Store Connect должны быть настроены для всех территорий где планируете продавать
