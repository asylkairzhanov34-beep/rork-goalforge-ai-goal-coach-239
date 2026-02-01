# Быстрый старт RevenueCat (для Windows)

## Что уже сделано ✅

1. ✅ Установлен пакет `react-native-purchases`
2. ✅ Создан провайдер подписок `hooks/use-subscription-store.tsx`
3. ✅ Добавлен экран подписки `/subscription`
4. ✅ Интегрирован в профиль пользователя
5. ✅ Настроены env переменные

## Что нужно сделать

### 1. Получить Apple Developer аккаунт ($99/год)
- Перейти на https://developer.apple.com
- Зарегистрироваться и оплатить

### 2. Создать аккаунт RevenueCat (бесплатно)
- https://www.revenuecat.com
- Создать проект

### 3. Настроить продукты в App Store Connect
1. Перейти на https://appstoreconnect.apple.com
2. Создать приложение (Bundle ID: `app.rork.goalforge`)
3. Создать Subscription Group
4. Добавить продукты:
   - `premium_monthly` - Месячная подписка ($9.99)
   - `premium_yearly` - Годовая подписка ($79.99) - опционально

### 4. Связать App Store Connect с RevenueCat
1. В App Store Connect создать In-App Purchase Key
2. Загрузить ключ в RevenueCat Dashboard
3. Скопировать iOS API Key из RevenueCat

### 5. Добавить API ключи в .env
Откройте файл `env` и добавьте:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_ваш_ключ_здесь
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_ваш_ключ_здесь
```

### 6. Тестирование
- Создать Sandbox Tester в App Store Connect
- Тестировать только на физическом iOS устройстве
- В Expo Go покупки НЕ работают - нужен Development Build

## Использование в коде

### Проверка Premium статуса
```typescript
import { useSubscription } from '@/hooks/use-subscription-store';

function MyComponent() {
  const { isPremium } = useSubscription();

  if (!isPremium) {
    return <Text>Доступно только в Premium</Text>;
  }

  return <PremiumFeature />;
}
```

### Открыть экран подписки
```typescript
import { useRouter } from 'expo-router';

function MyComponent() {
  const router = useRouter();
  
  return (
    <Button 
      title="Получить Premium" 
      onPress={() => router.push('/subscription')}
    />
  );
}
```

## Подробная инструкция

Смотрите **REVENUECAT_SETUP.md** для детальных шагов со скриншотами и пояснениями.

## Ограничения Windows

❌ **Не можете сделать с Windows:**
- Собрать .ipa файл локально
- Тестировать покупки в iOS Simulator

✅ **Можете сделать с Windows:**
- Всю настройку через веб-интерфейсы
- Написать весь код
- Использовать EAS Build для облачной сборки

## Поддержка

Если возникли проблемы:
1. Проверьте, что Bundle ID совпадает везде
2. Убедитесь, что Product ID точно совпадают
3. Проверьте, что API ключи правильные
4. Посмотрите логи в консоли: `console.log` в провайдере
