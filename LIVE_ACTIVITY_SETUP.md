# Live Activities Setup Guide (iOS Lock Screen Timer)

This guide explains how to enable the Live Activity feature that shows a beautiful timer on your iPhone's lock screen and Dynamic Island, similar to the Opal app.

## What You'll Get

- **Lock Screen Widget**: A beautiful timer widget on the lock screen showing remaining time, progress bar, and session type
- **Dynamic Island**: Compact and expanded views in the Dynamic Island (iPhone 14 Pro and later)
- **Real-time Updates**: The timer counts down in real-time even when the app is in background

## Requirements

- iOS 16.1 or later
- EAS Build (custom development build, not Expo Go)
- Apple Developer Account

## Setup Steps

### 1. Update app.json

Add the following to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSSupportsLiveActivities": true,
        "NSSupportsLiveActivitiesFrequentUpdates": true
      },
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.app.goalforge-ai-goal-coach"
        ]
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

### 2. Create App Group in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/applicationGroup)
2. Create a new App Group with identifier: `group.app.goalforge-ai-goal-coach`
3. Add this App Group to your main app's App ID
4. Regenerate your provisioning profiles

### 3. Add Native Module Files to iOS Project

The plugin creates the Widget Extension automatically during `expo prebuild`. However, you need to manually add the native module files to your main iOS project.

Copy these files to your `ios/GoalForgeAIGoalCoachClone2/` directory:

**LiveActivityModule.swift** (from `plugins/LiveActivityModule.swift`)
**LiveActivityModule.m** (from `plugins/LiveActivityModule.m`)

Also copy the `TimerActivityAttributes.swift` to the main target (it's shared between the app and widget):

```swift
// TimerActivityAttributes.swift
import Foundation
import ActivityKit

struct TimerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var remainingTime: Int
        var isPaused: Bool
        var progress: Double
        var endTime: Date
    }
    
    var timerName: String
    var mode: String
    var totalDuration: Int
}
```

### 4. Configure Xcode Project

After running `expo prebuild`, open the Xcode project and:

1. **Add Widget Extension Target**:
   - File > New > Target > Widget Extension
   - Name it "TimerWidget"
   - Enable "Include Live Activity"

2. **Copy Widget Files**:
   - Copy files from `ios/TimerWidget/` to your widget target:
     - `TimerWidgetBundle.swift`
     - `TimerLiveActivity.swift`
     - `TimerActivityAttributes.swift`

3. **Configure Signing**:
   - Select the TimerWidget target
   - Set the correct Team and Bundle Identifier
   - Bundle ID should be: `app.goalforge-ai-goal-coach.TimerWidget`

4. **Add App Group**:
   - Select both targets (main app and TimerWidget)
   - Go to Signing & Capabilities
   - Add "App Groups" capability
   - Add: `group.app.goalforge-ai-goal-coach`

5. **Add Native Module to Bridge**:
   - In your main target, add `LiveActivityModule.swift` and `LiveActivityModule.m`
   - Make sure the bridging header includes React Native imports

### 5. Build with EAS

```bash
eas build --platform ios --profile development
```

## How It Works

The Live Activity integration is automatic once set up:

1. **Start Timer**: When you start a focus session, a Live Activity is created
2. **Background**: The timer continues on the lock screen when you leave the app
3. **Updates**: Progress bar and time update in real-time
4. **Pause/Resume**: Live Activity reflects the paused state
5. **Complete**: Live Activity is dismissed when the timer completes

## Live Activity UI Preview

### Lock Screen
```
┌─────────────────────────────────────┐
│ 🔥 Focus Session          19:53    │
│ 🎯 Stay focused           ████░░░░ │
└─────────────────────────────────────┘
```

### Dynamic Island (Expanded)
```
┌──────────────────────────────────────────┐
│ 🔥 Focus Session              19:53     │
│ ████████████░░░░░░░░                    │
│ Stay focused                   75% left │
└──────────────────────────────────────────┘
```

### Dynamic Island (Compact)
```
┌───────────────────┐
│ 🔥 │    │ 19:53  │
└───────────────────┘
```

## Troubleshooting

### Live Activity Not Showing

1. **Check iOS version**: Must be iOS 16.1+
2. **Check Settings**: Settings > [App Name] > Live Activities must be enabled
3. **Check Logs**: Look for `[TimerStore] Live Activity started:` in console

### Widget Build Errors

1. **App Group mismatch**: Ensure both targets use the same App Group
2. **Missing Attributes**: Both targets must include `TimerActivityAttributes.swift`
3. **Signing issues**: Check provisioning profiles include App Group capability

### Native Module Not Found

1. **Bridging header**: Ensure React Native headers are imported
2. **Build order**: Widget target should not depend on main app target
3. **Clean build**: Try cleaning build folder (Cmd + Shift + K)

## Files Created

```
plugins/
├── withLiveActivity.js       # Expo config plugin
├── LiveActivityModule.swift  # Native module (Swift)
└── LiveActivityModule.m      # Native module (ObjC bridge)

hooks/
└── use-live-activity.tsx     # React Native hook (standalone)
└── use-timer-store.tsx       # Updated with Live Activity integration
```

## Color Scheme

The Live Activity uses your app's color scheme:
- **Focus**: Gold/Yellow (#FFD12A)
- **Short Break**: Green (#10B981)
- **Long Break**: Blue (#6182FF)

## Next Steps

After setup, the Live Activity feature works automatically with your existing timer. Just start a focus session and minimize the app to see the beautiful lock screen widget!

For any issues, check the console logs for `[LiveActivity]` or `[TimerStore]` prefixed messages.
