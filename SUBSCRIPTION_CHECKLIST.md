# ✅ Чеклист настройки подписок RevenueCat + Apple

## Проверка настройки (следуйте по порядку!)

### 1️⃣ Apple Developer Console

**Bundle ID должен быть:** `app.personalized-ai-goal-coach`

✅ Проверьте:
- [ ] Bundle ID создан и активен
- [ ] Sign In with Apple включен
- [ ] App ID Prefix (Team ID): `793SVLP744`

### 2️⃣ App Store Connect

**Проверьте продукты:**

✅ Premium Monthly:
- [ ] Product ID: `premium_monthly2`
- [ ] Status: **Ready to Submit** (желтый круг)
- [ ] Subscription Group: `Premium Access` 
- [ ] Subscription Group ID: `21834735`

✅ Premium Yearly:
- [ ] Product ID: `premium_yearly2`
- [ ] Status: **Ready to Submit** (желтый круг)
- [ ] Subscription Group: `Premium Access`
- [ ] Subscription Group ID: `21834735`

✅ Настройки подписок:
- [ ] "Оптимизированный интерфейс для покупок" - **ВКЛЮЧЕН**

✅ Банковские данные и налоги:
- [ ] Банковский счет настроен
- [ ] Налоговые формы заполнены
- [ ] Соглашения подписаны и активны

### 3️⃣ RevenueCat Dashboard

**API Keys:**
- iOS App Key: `appl_NIzzmGwASbGFsnfAddnshynSnsG` ✅

**App Configuration:**
- [ ] RevenueCat App ID: `appa92d37048c`
- [ ] Bundle ID в RevenueCat: `app.personalized-ai-goal-coach`
- [ ] Platform: iOS (App Store)

**Products (в RevenueCat):**
- [ ] Premium Monthly: `premium_monthly2` → привязан к Apple Product ID `premium_monthly2`
- [ ] Premium Yearly: `premium_yearly2` → привязан к Apple Product ID `premium_yearly2`

**Entitlement:**
- [ ] Identifier: `premium`
- [ ] Products attached: Premium Monthly + Premium Yearly

**Offering:**
- [ ] Identifier: `default`
- [ ] Display Name: Standard
- [ ] Packages:
  - Monthly (`$rc_monthly`): Premium Monthly
  - Yearly (`$rc_annual`): Premium Yearly

### 4️⃣ Проект (код)

**app.json:**
```json
"ios": {
  "bundleIdentifier": "app.personalized-ai-goal-coach"
}
```

**env файл:**
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_NIzzmGwASbGFsnfAddnshynSnsG
```

### 5️⃣ TestFlight

**Sandbox Tester:**
- [ ] Email: `asylkairzhanov0@gmail.com`
- [ ] Country: Kazakhstan
- [ ] Account активен

---

## 🔥 КРИТИЧЕСКИЕ ПРОВЕРКИ

### Почему offerings могут НЕ загружаться:

1. **Bundle ID не совпадает**
   - app.json: `app.personalized-ai-goal-coach`
   - RevenueCat App Config: должен быть **ТОЧНО ТАК ЖЕ**
   - Apple Developer: должен быть **ТОЧНО ТАК ЖЕ**

2. **Product IDs не совпадают**
   - App Store Connect: `premium_monthly2`, `premium_yearly2`
   - RevenueCat Products: должны быть **ТОЧНО ТАК ЖЕ**

3. **Продукты не "Ready to Submit"**
   - В App Store Connect оба продукта должны иметь желтый круг "Ready to Submit"
   - Если статус другой - offerings не загрузятся!

4. **Продукты не прикреплены к Offering**
   - В RevenueCat оба продукта должны быть в Offering "default"
   - В Packages должны быть Monthly и Yearly

5. **Неправильный Offering Identifier**
   - По умолчанию RevenueCat ищет offering с identifier "default"
   - Убедитесь, что у вас есть offering "default"

---

## 🐛 Что проверить, если не работает:

### В логах Xcode/TestFlight ищите:

```
📦 [_layout.tsx] Offerings ответ
```

**Если `packagesCount: 0`:**
1. Проверьте Bundle ID в 3 местах (см. выше)
2. Проверьте Product IDs в App Store Connect и RevenueCat
3. Убедитесь, что продукты "Ready to Submit"
4. Убедитесь, что продукты прикреплены к Offering в RevenueCat

**Если ошибка "Invalid API key":**
- Проверьте, что ключ `appl_NIzzmGwASbGFsnfAddnshynSnsG` правильный
- Проверьте, что это **iOS App Key**, а не Web или Test Key

**Если ошибка "Could not find app":**
- Bundle ID в app.json не совпадает с Bundle ID в RevenueCat

---

## 📱 Тестирование на TestFlight

1. **Войдите в настройки iOS → App Store → Sandbox Account**
2. **Добавьте тестовый аккаунт:** `asylkairzhanov0@gmail.com`
3. **Откройте приложение через TestFlight**
4. **Проверьте логи:**
   - RevenueCat должен инициализироваться
   - Offerings должны загружаться
   - Packages должны быть с ценами

5. **Нажмите "Попробовать Premium":**
   - Должен появиться стандартный Apple Pay интерфейс
   - Должна быть цена в KZT или USD
   - Должна быть кнопка "Подписаться"

---

## 🆘 Если ничего не помогает

1. **Удалите приложение с устройства**
2. **Переустановите через TestFlight**
3. **Проверьте логи сразу при запуске**
4. **Убедитесь, что вы вошли в Sandbox аккаунт**

---

## 📞 Важные ссылки

- RevenueCat Dashboard: https://app.revenuecat.com
- Apple Developer: https://developer.apple.com
- App Store Connect: https://appstoreconnect.apple.com

---

## ✨ Правильные настройки

### RevenueCat Product для Monthly:
```
Identifier: premium_monthly2
App: Goal Forge Ai (App Store)  
Store: App Store
Product Type: Subscription
Subscription group: Premium Access
Associated Entitlements: premium
Associated Offerings: default (Standard)
```

### RevenueCat Product для Yearly:
```
Identifier: premium_yearly2
App: Goal Forge Ai (App Store)
Store: App Store
Product Type: Subscription
Subscription group: Premium Access
Associated Entitlements: premium
Associated Offerings: default (Standard)
```

### RevenueCat Offering:
```
Identifier: default
Display Name: Standard
Packages:
  - Yearly ($rc_annual): Premium Yearly (premium_yearly2)
  - Monthly ($rc_monthly): Premium Monthly (premium_monthly2)
```
