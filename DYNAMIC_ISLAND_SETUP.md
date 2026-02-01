# Dynamic Island & Live Activities - Setup Guide

## Why It's Not Working

Dynamic Island and Live Activities require **native iOS Widget Extension** that must be added **manually in Xcode**. This cannot be done through Expo Go or the web preview - it requires a **custom build**.

## What You Need To Do

### Step 1: Update app.json

Add these lines to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSSupportsLiveActivities": true,
        "NSSupportsLiveActivitiesFrequentUpdates": true,
        "UIBackgroundModes": ["audio"]
      }
    },
    "plugins": [
      ["./plugins/withLiveActivity.js", {
        "appGroupIdentifier": "group.app.goalforge-ai-goal-coach"
      }]
    ]
  }
}
```

### Step 2: Create App Group in Apple Developer Portal

1. Go to https://developer.apple.com/account/resources/identifiers/list/applicationGroup
2. Click "+" to create new App Group
3. Enter identifier: `group.app.goalforge-ai-goal-coach`
4. Save and register

### Step 3: Update App ID

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Find your app ID: `app.goalforge-ai-goal-coach`
3. Click Edit
4. Enable "App Groups" capability
5. Select `group.app.goalforge-ai-goal-coach`
6. Save

### Step 4: Run Prebuild

```bash
npx expo prebuild --clean
```

This will generate the iOS native project with Live Activity files.

### Step 5: Add Widget Extension in Xcode

1. Open `ios/GoalForgeAIGoalCoachClone2.xcworkspace` in Xcode
2. File → New → Target
3. Select "Widget Extension"
4. Name: `TimerWidget`
5. **IMPORTANT**: Check "Include Live Activity"
6. Finish

### Step 6: Configure Widget Target

1. Select the `TimerWidget` target in Xcode
2. Go to "Signing & Capabilities"
3. Set your Team
4. Set Bundle Identifier: `app.goalforge-ai-goal-coach.TimerWidget`
5. Click "+ Capability" → Add "App Groups"
6. Select `group.app.goalforge-ai-goal-coach`

### Step 7: Copy Widget Files

After prebuild, copy these files from `ios/TimerWidget/` to your Widget target:
- `TimerWidgetBundle.swift`
- `TimerLiveActivity.swift`
- `TimerActivityAttributes.swift`

**Replace** any auto-generated widget files with these.

### Step 8: Copy Native Module to Main App

Copy these files from `ios/GoalForgeAIGoalCoachClone2/LiveActivityModule/` to your main target:
- `LiveActivityModule.swift`
- `LiveActivityModule.m`
- `SharedTimerAttributes.swift`

### Step 9: Create Bridging Header (if not exists)

Create `GoalForgeAIGoalCoachClone2-Bridging-Header.h`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```

### Step 10: Build and Test

1. Connect your iPhone (not simulator!)
2. Select your device in Xcode
3. Build and run (Cmd + R)

## Expected Result

When you start a timer:

### Dynamic Island (Compact)
```
┌───────────────────┐
│ [Logo] │ 24:53   │
└───────────────────┘
```

### Dynamic Island (Expanded)
```
┌──────────────────────────────────────────┐
│ [Logo] Focus Session          remaining  │
│                                  24:53   │
│ ████████████░░░░░░░░                     │
│ 🔥 Stay focused               75% left   │
└──────────────────────────────────────────┘
```

### Lock Screen Widget
```
┌─────────────────────────────────────┐
│ [Logo] Focus Session       24:53   │
│        ████░░░░  75%     remaining │
└─────────────────────────────────────┘
```

## Troubleshooting

### "Live Activity not appearing"
1. Go to Settings → [Your App] → Live Activities → Enable
2. Make sure iOS 16.1 or later
3. Check console logs for `[LiveActivity]` messages

### "Module not found"
- Ensure `LiveActivityModule.swift` and `.m` are added to the main target
- Clean build folder: Cmd + Shift + K

### "App Group error"
- Both targets (main app + widget) must have SAME App Group
- Regenerate provisioning profiles after adding App Group

### "Widget not building"
- Check that `TimerActivityAttributes.swift` is in BOTH targets
- Widget target minimum iOS should be 16.1

## Important Notes

1. **This only works on real devices** - Simulator doesn't support Dynamic Island
2. **Requires iPhone 14 Pro or later** for Dynamic Island
3. **iOS 16.1+** required for Live Activities
4. **EAS Build or local Xcode build** required - Expo Go won't work

## Files Reference

```
plugins/
├── withLiveActivity.js         # Config plugin (generates native code)
├── LiveActivityModule.swift    # Native module source
└── LiveActivityModule.m        # ObjC bridge source

hooks/
└── use-live-activity.tsx       # React Native hook

Generated after prebuild:
ios/TimerWidget/
├── TimerWidgetBundle.swift
├── TimerLiveActivity.swift
├── TimerActivityAttributes.swift
├── TimerWidget.entitlements
└── Info.plist

ios/GoalForgeAIGoalCoachClone2/LiveActivityModule/
├── LiveActivityModule.swift
├── LiveActivityModule.m
└── SharedTimerAttributes.swift
```

## Quick Checklist

- [ ] App Group created in Apple Developer Portal
- [ ] App ID has App Groups capability enabled
- [ ] `npx expo prebuild --clean` completed
- [ ] Widget Extension added in Xcode
- [ ] Widget target has correct Bundle ID
- [ ] Both targets have App Groups capability
- [ ] Both targets use same App Group identifier
- [ ] `TimerActivityAttributes.swift` in both targets
- [ ] Native module files added to main target
- [ ] Tested on real iPhone 14 Pro or later
