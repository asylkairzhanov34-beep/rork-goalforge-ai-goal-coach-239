# Отладка покупок в TestFlight Sandbox

## Проблема
Вы нажимаете "Активировать Premium", но окно покупки Apple не появляется, и подписка не показывается в Subscriptions.

## Возможные причины

### 1. Настройка продуктов в RevenueCat
**Проверьте:**
1. Откройте [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Перейдите в ваш проект → Products
3. Убедитесь, что есть хотя бы один продукт (например: `premium_monthly`, `premium_yearly`)
4. Каждый продукт должен иметь:
   - **Product ID** (должен совпадать с App Store Connect)
   - **App Store** выбран как платформа

### 2. Настройка Offerings в RevenueCat
**Проверьте:**
1. RevenueCat Dashboard → Offerings
2. Должен быть хотя бы один Offering (например: `default`)
3. В Offering должны быть добавлены Packages:
   - `$rc_monthly` или custom identifier
   - `$rc_annual` или custom identifier
4. Каждый Package должен быть связан с Product

### 3. App Store Connect - Продукты
**Проверьте:**
1. Откройте [App Store Connect](https://appstoreconnect.apple.com/)
2. My Apps → GoalForge AI Goal Coach → Subscriptions
3. Убедитесь что есть подписки со статусом **Ready to Submit** или **Approved**
4. Product ID в App Store Connect должен совпадать с Product ID в RevenueCat

**Пример:**
- App Store Connect: `premium_monthly`
- RevenueCat Products: `premium_monthly` ✅

### 4. Sandbox Account - вход/выход
**КРИТИЧНО для тестирования:**

1. **Выйдите из App Store ПЕРЕД покупкой:**
   ```
   Settings → [Your Name] → Media & Purchases → Sign Out
   ```

2. **НЕ входите заранее в Sandbox аккаунт!**
   - Система сама попросит войти при покупке
   - Тогда появится надпись [Sandbox Environment]

3. **Нажмите "Попробовать Premium" в приложении**
   - Должно появиться окно покупки Apple
   - В окне должно быть написано [Sandbox Environment]
   - Введите Sandbox email и пароль

### 5. RevenueCat - App Settings
**Проверьте:**
1. RevenueCat Dashboard → Apps → [Your App]
2. App Store Connect Integration:
   - Должен быть подключен App Store Connect
   - Shared Secret должен быть настроен
   - In-App Purchase Key должен быть загружен

## Отладка в приложении

В TestFlight версии вашего приложения есть debug логи. Чтобы их увидеть:

1. Откройте приложение через Xcode или через Console.app на Mac
2. Найдите строки с `[RevenueCat]`
3. При нажатии "Попробовать Premium" должно появиться:
   ```
   [RevenueCat] Initiating purchase for: $rc_monthly
   [RevenueCat] Purchase successful
   ```

**Если видите:**
```
[RevenueCat] purchasePackage - module not ready
```
Значит RevenueCat не инициализирован. Проверьте API ключ.

**Если видите:**
```
[RevenueCat] getOfferings - No offerings available
```
Значит в RevenueCat Dashboard не настроены Offerings.

## Пошаговая инструкция тестирования

1. **Подготовка:**
   - Убедитесь что в RevenueCat настроены Products и Offerings
   - Убедитесь что в App Store Connect есть подписки
   - Выйдите из App Store на устройстве

2. **Установите приложение через TestFlight**

3. **Откройте приложение**
   - При первом запуске может появиться paywall
   - Или откройте Settings → Subscription

4. **Нажмите "Попробовать Premium" или "Активировать Premium"**
   - Должно появиться **системное окно Apple** с ценой
   - В окне должно быть `[Sandbox Environment]`

5. **Введите Sandbox credentials когда попросит**

6. **После покупки:**
   - Приложение должно показать "Подписка активна"
   - Settings → App Store → Sandbox Account → Manage
   - Там должна появиться подписка

## Типичные ошибки

### ❌ "No products available"
**Решение:** Настройте Products в RevenueCat и свяжите с App Store Connect

### ❌ "User cancelled"  
**Решение:** Пользователь отменил покупку - это нормально

### ❌ Окно покупки не появляется
**Решение:** 
1. Проверьте что RevenueCat инициализирован
2. Проверьте логи в Console.app
3. Убедитесь что есть Offerings в RevenueCat

### ❌ "[Environment: Production]" вместо "[Sandbox]"
**Решение:** Выйдите из обычного Apple ID в Settings

### ❌ Покупка проходит, но подписка не активируется
**Решение:**
1. Проверьте entitlement identifier в RevenueCat
2. Должен быть entitlement с identifier `premium`
3. Убедитесь что Products связаны с этим entitlement

## Дополнительная информация

### Проверка Entitlements в RevenueCat
1. RevenueCat Dashboard → Entitlements
2. Должен быть entitlement с identifier: `premium`
3. К нему должны быть привязаны все ваши Products

### Sandbox Tester в App Store Connect
1. App Store Connect → Users and Access → Sandbox Testers
2. Убедитесь что создан Sandbox тестер
3. Используйте его email/password для покупок

### Логи в приложении
При покупке вы должны увидеть в логах:
```
[SubscriptionProvider] Initiating purchase for: $rc_monthly
[RevenueCat] Purchasing package: $rc_monthly
[RevenueCat] Purchase successful
[SubscriptionProvider] Customer info fetched, active subs: 1
```

## Контакты
Если проблема не решается, проверьте:
1. RevenueCat Status: https://status.revenuecat.com/
2. RevenueCat Community: https://community.revenuecat.com/
