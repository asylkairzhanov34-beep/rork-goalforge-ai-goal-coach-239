# RevenueCat Production Setup Guide

## Quick Setup Steps

### 1. Create RevenueCat Account
1. Go to [revenuecat.com](https://www.revenuecat.com/)
2. Sign up for free account
3. Create new project: "GoalForge"

### 2. Configure App in RevenueCat

#### iOS Setup:
1. **Add iOS App**:
   - Bundle ID: (from app.json)
   - App Name: GoalForge
   - Select "App Store"

2. **Get API Key**:
   - Copy the iOS API key
   - Already added to code: `appl_NIzzmGwASbGFsnfAddnshynSnsG`
   - ⚠️ **IMPORTANT**: Replace with your own key!

3. **Add App Store Connect Credentials**:
   - Settings → Integrations → App Store Connect
   - Upload .p8 key OR use In-App Purchase Key
   - Team ID + Key ID

#### Android Setup (Optional):
1. Add Android app
2. Copy Android API key
3. Update in `hooks/use-subscription-store.tsx`:
   ```typescript
   const REVENUECAT_API_KEY = {
     ios: 'YOUR_IOS_KEY',
     android: 'YOUR_ANDROID_KEY', // Replace this
     web: '',
   };
   ```
4. Add Google Play credentials

### 3. Create Products in App Store Connect

#### Monthly Subscription:
- Product ID: `premium_monthly`
- Type: Auto-Renewable Subscription
- Subscription Group: "Premium"
- Duration: 1 month
- Price: $9.99 (or your price)
- Description: "Monthly Premium Access"

#### Yearly Subscription:
- Product ID: `premium_yearly`
- Type: Auto-Renewable Subscription
- Subscription Group: "Premium"
- Duration: 1 year
- Price: $79.00 (or your price)
- Description: "Yearly Premium Access (Save $40)"

### 4. Create Entitlements in RevenueCat

1. Go to RevenueCat Dashboard → Entitlements
2. Click "+ New"
3. Create entitlement:
   - **Identifier**: `premium`
   - **Name**: "Premium Access"
   - **Description**: "Full access to all premium features"

### 5. Create Products in RevenueCat

1. Go to Products tab
2. Add iOS products:
   - Click "+ New"
   - **Identifier**: `premium_monthly`
   - **Store**: App Store
   - **App**: GoalForge iOS
   - **Product ID**: `premium_monthly` (must match App Store Connect)
   
3. Repeat for `premium_yearly`

### 6. Create Offering in RevenueCat

1. Go to Offerings tab
2. Create new offering:
   - **Identifier**: `default`
   - **Name**: "Default Offering"
   - **Description**: "Standard subscription options"

3. Add packages:
   - **Package 1**:
     - Identifier: `$rc_monthly`
     - Product: `premium_monthly`
     - Entitlement: `premium`
   
   - **Package 2**:
     - Identifier: `$rc_annual`
     - Product: `premium_yearly`
     - Entitlement: `premium`

4. Make this offering "Current" (toggle switch)

### 7. Test with Sandbox Account

#### Create Sandbox Tester:
1. App Store Connect → Users and Access → Sandbox Testers
2. Click "+"
3. Create test Apple ID
4. Note email + password

#### Test on Device:
1. Sign out of real Apple ID in device Settings
2. Build app to device (Development)
3. Open app, go through flow
4. When payment sheet appears, sign in with sandbox account
5. Complete "purchase" (it's free in sandbox)
6. Verify premium features unlock

### 8. Production Checklist

- [ ] Replace demo RevenueCat iOS API key with your own
- [ ] Add Android API key if supporting Android
- [ ] Create subscription products in App Store Connect
- [ ] Add products to RevenueCat
- [ ] Create "premium" entitlement
- [ ] Create "default" offering with monthly + yearly packages
- [ ] Test sandbox purchases thoroughly
- [ ] Submit app for review with IAP products
- [ ] Monitor RevenueCat dashboard for real purchases

## Current Code Configuration

### In `hooks/use-subscription-store.tsx`:

```typescript
const REVENUECAT_API_KEY = {
  ios: 'appl_NIzzmGwASbGFsnfAddnshynSnsG', // ⚠️ Replace with your key
  android: 'goog_...', // Add your Android key
  web: '',
};
```

### Expected Offering Structure:

```json
{
  "identifier": "default",
  "packages": [
    {
      "identifier": "$rc_monthly",
      "product": {
        "identifier": "premium_monthly",
        "title": "Monthly Subscription",
        "price": 9.99,
        "priceString": "$9.99",
        "currencyCode": "USD"
      }
    },
    {
      "identifier": "$rc_annual",
      "product": {
        "identifier": "premium_yearly",
        "title": "Annual Subscription",
        "price": 79.00,
        "priceString": "$79.00",
        "currencyCode": "USD"
      }
    }
  ]
}
```

### Required Entitlement:

```json
{
  "identifier": "premium",
  "isActive": true,
  "productIdentifier": "premium_monthly" // or "premium_yearly"
}
```

## Debugging

### Check Initialization:
```typescript
// Should see in console:
[SubscriptionProvider] Starting initialization...
[SubscriptionProvider] RevenueCat configured with key: appl_NIz...
[SubscriptionProvider] Initial customer info retrieved: []
[SubscriptionProvider] Loaded 2 subscription packages from RevenueCat
[SubscriptionProvider] Initialization complete
```

### Check Purchases:
```typescript
// After successful purchase:
[SubscriptionProvider] purchasing package $rc_annual
[SubscriptionProvider] purchase completed successfully
```

### Common Issues:

**"No offerings found"**
- Check offering is marked as "Current" in RevenueCat
- Verify products are linked to offering
- Check API key is correct

**"Product not found"**
- Product ID must match exactly between App Store Connect and RevenueCat
- Wait 24h after creating products for them to sync

**"Invalid receipt"**
- Using production build with sandbox account
- Use development build for sandbox testing

**"User cancelled"**
- Normal flow, not an error
- User dismissed payment sheet

## Support

- RevenueCat Docs: https://docs.revenuecat.com/
- Dashboard: https://app.revenuecat.com/
- Support: help@revenuecat.com

## Testing Credentials Storage

The app stores trial info in AsyncStorage:

```typescript
// View trial status
import AsyncStorage from '@react-native-async-storage/async-storage';
const trial = await AsyncStorage.getItem('@trial_info');
console.log('Trial:', JSON.parse(trial));

// Reset trial (for testing)
await AsyncStorage.multiRemove([
  '@trial_info',
  '@first_launch', 
  '@trial_offer_shown'
]);
```

## Analytics Integration

Currently logging to console. To integrate analytics:

```typescript
// In app/index.tsx, replace console.log with:
import { logEvent } from 'your-analytics-sdk';

// Example with Firebase:
logEvent('paywall_shown', { source: 'first_launch' });
logEvent('trial_started', { duration_days: 1 });
logEvent('trial_expired', { userId });
logEvent('purchase_success', { product_id, price });
```

Recommended events to track:
- `paywall_shown` - When paywall appears
- `trial_started` - When user starts trial
- `trial_expired` - When trial expires
- `feature_blocked` - When user hits premium gate
- `purchase_initiated` - Tapped upgrade button
- `purchase_success` - Completed purchase
- `purchase_cancelled` - User cancelled
- `restore_purchases` - User tapped restore
