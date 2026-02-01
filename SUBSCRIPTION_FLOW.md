# Subscription & Trial Flow Implementation

## Overview

GoalForge implements a **1-day free trial** with premium feature gating. Users get full access for 24 hours, after which they must purchase to continue using premium features.

## Flow Diagram

```
App Launch
    ↓
Check RevenueCat subscription
    ↓
┌─────────────────────────────┐
│ Has active premium?         │
│  ├─ Yes → Full access       │
│  └─ No → Check trial        │
└─────────────────────────────┘
                ↓
┌─────────────────────────────┐
│ Trial exists in storage?    │
│  ├─ No → Start 1-day trial  │
│  │        Show paywall modal│
│  │        (first launch)    │
│  └─ Yes → Check expiry      │
└─────────────────────────────┘
                ↓
┌─────────────────────────────┐
│ Trial expired?              │
│  ├─ No → Allow access       │
│  │        (within 24h)      │
│  └─ Yes → Block access      │
│           Show fullscreen   │
│           paywall           │
└─────────────────────────────┘
```

## Key Components

### 1. **SubscriptionProvider** (`hooks/use-subscription-store.tsx`)

Manages subscription state, trial logic, and RevenueCat integration.

**Key methods:**
- `initializeTrial()` - Starts or loads trial info
- `canAccessPremiumFeatures()` - Returns true if user has premium OR active trial
- `getFeatureAccess()` - Returns object with all feature flags
- `markTrialOfferShown()` - Marks that paywall was shown once

**Storage keys:**
- `@trial_info` - Contains `{ startDate, endDate, isExpired }`
- `@first_launch` - Boolean flag for first app launch
- `@trial_offer_shown` - Boolean flag to track if initial paywall was shown

### 2. **SubscriptionPaywall** (`components/SubscriptionPaywall.tsx`)

Modal/fullscreen UI for subscription offers.

**Props:**
- `visible: boolean` - Show/hide modal
- `onClose?: () => void` - Close handler (ignored if fullscreen)
- `feature?: string` - Name of blocked feature
- `fullscreen?: boolean` - Fullscreen mode for trial expiry
- `isFirstLaunch?: boolean` - Shows special first-launch UI with benefits list

**Variants:**
- **First Launch**: Shows benefits, "Start free trial" CTA, allows skip
- **Feature Block**: Shows locked feature message
- **Trial Expired**: Fullscreen, no close, forces upgrade

### 3. **PremiumGate** (`components/PremiumGate.tsx`)

HOC to gate premium features.

**Basic Usage:**
```tsx
import PremiumGate from '@/components/PremiumGate';

<PremiumGate 
  feature="Месячный план" 
  message="Доступ к месячному плану"
>
  <MonthlyPlanView />
</PremiumGate>
```

**Hook Usage:**
```tsx
import { usePremiumGate } from '@/components/PremiumGate';

function MyScreen() {
  const { checkAccess, hasAccess, featureAccess, PaywallModal } = usePremiumGate();

  const handleFeatureAction = () => {
    if (!checkAccess('Month Plan')) return;
    // Execute premium action
  };

  return (
    <>
      <Button onPress={handleFeatureAction}>View Month Plan</Button>
      <PaywallModal />
    </>
  );
}
```

### 4. **Index Route** (`app/index.tsx`)

Root navigation logic with trial checks.

**Flow:**
1. Wait for auth + subscription initialization
2. If trial expired AND not premium → show fullscreen paywall
3. If authenticated but no profile → redirect to setup
4. If first launch after setup → show paywall modal (can be dismissed)
5. Otherwise → redirect to home

## Trial Mechanics

### Starting Trial
- Automatically starts when user first opens app (no premium subscription found)
- `trialStartAt` saved as ISO string in AsyncStorage
- `trialEndDate` = `trialStartAt + 1 day`

### Checking Trial Status
```typescript
const { trialInfo, canAccessPremiumFeatures } = useSubscription();

// trialInfo = { startDate, endDate, isExpired }
const hasAccess = canAccessPremiumFeatures(); // true if premium OR trial active
```

### Trial Expiry
- Checked on every app launch
- When expired:
  - `canAccessPremiumFeatures()` returns `false`
  - Premium features blocked
  - Fullscreen paywall shown in `app/index.tsx`

## Feature Access Control

### Feature Flags

```typescript
const { getFeatureAccess } = useSubscription();
const access = getFeatureAccess();

// Free features (always true)
access.addTasks
access.oneDayPlan
access.pomodoroTimer
access.basicGamification
access.oneDayHistory
access.basicThemes

// Limited free features
access.aiAdviceLimit // 3 for free, Infinity for premium
access.smartTasksLimit // 1 for free, Infinity for premium

// Premium only (false for free/expired trial)
access.dailyAICoach
access.weeklyMonthlyPlan
access.weeklyAIReport
access.unlimitedAIAdvice
access.unlimitedSmartTasks
access.extendedHistory
access.levelsAndRewards
access.aiChatAssistant
access.prioritySpeed
access.smartPomodoroAnalytics
access.allFutureFeatures
```

### Gating Examples

**1. Block entire screen:**
```tsx
import PremiumGate from '@/components/PremiumGate';

export default function MonthOverviewScreen() {
  return (
    <PremiumGate feature="Месячный обзор">
      <MonthlyView />
    </PremiumGate>
  );
}
```

**2. Block specific action:**
```tsx
const { checkAccess } = usePremiumGate();

const handleGenerateAIReport = () => {
  if (!checkAccess('AI Report')) return;
  generateReport();
};
```

**3. Show limited state:**
```tsx
const { getFeatureAccess } = useSubscription();
const access = getFeatureAccess();

return (
  <>
    {tasks.slice(0, access.smartTasksLimit).map(task => (
      <TaskCard key={task.id} task={task} />
    ))}
    {tasks.length > access.smartTasksLimit && (
      <UpgradePrompt />
    )}
  </>
);
```

## Purchase Flow

### Native (iOS/Android)
1. User taps "Upgrade" in paywall
2. Redirected to `/subscription` screen
3. Select package (monthly/yearly)
4. Tap "Try Premium"
5. RevenueCat `purchasePackage()` called
6. Native payment sheet appears
7. On success:
   - `customerInfo.entitlements.active['premium']` populated
   - `status` → `'premium'`
   - Paywall closes
   - Full access granted

### Web (Mock Mode)
1. Same UI flow
2. Purchase mocked with AsyncStorage
3. Subscription stored with expiry date
4. Mock entitlements created

## Analytics Events

Defined in `app/index.tsx`:

```typescript
const ANALYTICS_EVENTS = {
  PAYWALL_SHOWN: 'paywall_shown',
  TRIAL_STARTED: 'trial_started',
  TRIAL_EXPIRED: 'trial_expired',
  FEATURE_BLOCKED: 'feature_blocked',
};
```

*Note: Currently logged to console. Integrate with analytics SDK (Mixpanel, Amplitude, etc.) as needed.*

## Storage Schema

### Trial Info (`@trial_info`)
```json
{
  "startDate": "2025-01-15T10:30:00.000Z",
  "endDate": "2025-01-16T10:30:00.000Z",
  "isExpired": false
}
```

### First Launch (`@first_launch`)
```json
"false"
```

### Trial Offer Shown (`@trial_offer_shown`)
```json
"true"
```

## RevenueCat Configuration

### Required Setup

1. **Create entitlement:**
   - Name: `premium`
   - Products: Link your App Store / Play Store IAPs

2. **Create offering:**
   - Identifier: `default`
   - Packages: `$rc_monthly`, `$rc_annual`, etc.

3. **Add API keys:**
   - iOS: `appl_NIzzmGwASbGFsnfAddnshynSnsG` (already in code)
   - Android: Update in `hooks/use-subscription-store.tsx`

### Testing Purchases

**iOS:**
- Sandbox tester account in App Store Connect
- Sign out of real Apple ID in device Settings
- Run app, initiate purchase
- Sign in with sandbox account when prompted

**Web:**
- Automatic mock mode
- Purchase stored in AsyncStorage
- No real payment

## Production Checklist

- [ ] Update RevenueCat API keys (iOS + Android)
- [ ] Configure RevenueCat dashboard (entitlements, offerings, products)
- [ ] Link IAP products in App Store Connect / Play Console
- [ ] Test sandbox purchases on device
- [ ] Integrate analytics SDK and emit events
- [ ] Add restore purchases button (already in SubscriptionScreen)
- [ ] Test trial expiry flow (can manually edit storage)
- [ ] Add terms & privacy policy links (placeholders exist)
- [ ] Test all premium feature gates
- [ ] Configure intro offers / promotional pricing if desired

## Debugging

### Check trial status manually:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In dev console or screen:
AsyncStorage.getItem('@trial_info').then(data => {
  console.log('Trial:', JSON.parse(data));
});
```

### Reset trial:
```typescript
await AsyncStorage.removeItem('@trial_info');
await AsyncStorage.removeItem('@first_launch');
await AsyncStorage.removeItem('@trial_offer_shown');
// Restart app
```

### Force trial expiry:
```typescript
const expired = {
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-01-02T00:00:00.000Z',
  isExpired: true
};
await AsyncStorage.setItem('@trial_info', JSON.stringify(expired));
// Restart app or trigger re-check
```

## Known Limitations

1. **Web platform**: RevenueCat not available, mock mode only
2. **Trial reset**: Users can clear storage to restart trial (add server-side validation for production)
3. **Offline checks**: Trial expiry checked on client; consider server validation
4. **Analytics**: Events logged but not sent to analytics platform yet

## Future Enhancements

- Server-side trial validation
- Grace period after trial expiry
- Multiple trial durations based on user segment
- A/B test paywall variants
- Offer discount codes
- Family sharing support
