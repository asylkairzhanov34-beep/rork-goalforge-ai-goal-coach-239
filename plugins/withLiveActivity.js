const { withInfoPlist, withXcodeProject, withEntitlementsPlist, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_NAME = 'TimerWidget';
const WIDGET_BUNDLE_ID_SUFFIX = '.TimerWidget';

function withLiveActivity(config, options = {}) {
  const { appGroupIdentifier } = options;
  
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    config.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return config;
  });

  config = withEntitlementsPlist(config, (config) => {
    const bundleId = config.ios?.bundleIdentifier || 'app.goalforge-ai-goal-coach';
    const appGroup = appGroupIdentifier || `group.${bundleId}`;
    
    if (!config.modResults['com.apple.security.application-groups']) {
      config.modResults['com.apple.security.application-groups'] = [];
    }
    
    if (!config.modResults['com.apple.security.application-groups'].includes(appGroup)) {
      config.modResults['com.apple.security.application-groups'].push(appGroup);
    }
    
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios');
      const widgetPath = path.join(iosPath, WIDGET_NAME);
      const projectName = config.modRequest.projectName || 'GoalForgeAIGoalCoachClone2';
      const modulesPath = path.join(iosPath, projectName, 'LiveActivityModule');
      
      if (!fs.existsSync(widgetPath)) {
        fs.mkdirSync(widgetPath, { recursive: true });
      }
      
      if (!fs.existsSync(modulesPath)) {
        fs.mkdirSync(modulesPath, { recursive: true });
      }

      const bundleId = config.ios?.bundleIdentifier || 'app.goalforge-ai-goal-coach';
      const appGroup = appGroupIdentifier || `group.${bundleId}`;
      
      // Generate Widget Extension files
      fs.writeFileSync(path.join(widgetPath, 'TimerWidgetBundle.swift'), generateWidgetBundle());
      fs.writeFileSync(path.join(widgetPath, 'TimerLiveActivity.swift'), generateLiveActivityView(appGroup));
      fs.writeFileSync(path.join(widgetPath, 'TimerActivityAttributes.swift'), generateAttributes());
      fs.writeFileSync(path.join(widgetPath, `${WIDGET_NAME}.entitlements`), generateEntitlements(appGroup));
      fs.writeFileSync(path.join(widgetPath, 'Info.plist'), generateInfoPlist(bundleId));
      
      // Generate Native Module files for React Native bridge
      fs.writeFileSync(path.join(modulesPath, 'LiveActivityModule.swift'), generateNativeModule(appGroup));
      fs.writeFileSync(path.join(modulesPath, 'LiveActivityModule.m'), generateBridgingHeader());
      
      // Create shared attributes file for both widget and native module
      fs.writeFileSync(path.join(modulesPath, 'SharedTimerAttributes.swift'), generateSharedAttributes());

      console.log(`[withLiveActivity] Widget Extension files created at: ${widgetPath}`);
      console.log(`[withLiveActivity] Native module files created at: ${modulesPath}`);
      
      return config;
    },
  ]);

  return config;
}

function generateWidgetBundle() {
  return `import WidgetKit
import SwiftUI

@main
struct TimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        TimerLiveActivity()
    }
}
`;
}

function generateAttributes() {
  return `import Foundation
import ActivityKit

public struct TimerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var remainingTime: Int
        public var isPaused: Bool
        public var progress: Double
        public var endTime: Date
        
        public init(remainingTime: Int, isPaused: Bool, progress: Double, endTime: Date) {
            self.remainingTime = remainingTime
            self.isPaused = isPaused
            self.progress = progress
            self.endTime = endTime
        }
    }
    
    public var timerName: String
    public var mode: String
    public var totalDuration: Int
    
    public init(timerName: String, mode: String, totalDuration: Int) {
        self.timerName = timerName
        self.mode = mode
        self.totalDuration = totalDuration
    }
}
`;
}

function generateSharedAttributes() {
  return `import Foundation
import ActivityKit

// Shared attributes accessible by both main app and widget extension
public struct SharedTimerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var remainingTime: Int
        public var isPaused: Bool
        public var progress: Double
        public var endTime: Date
        
        public init(remainingTime: Int, isPaused: Bool, progress: Double, endTime: Date) {
            self.remainingTime = remainingTime
            self.isPaused = isPaused
            self.progress = progress
            self.endTime = endTime
        }
    }
    
    public var timerName: String
    public var mode: String
    public var totalDuration: Int
    
    public init(timerName: String, mode: String, totalDuration: Int) {
        self.timerName = timerName
        self.mode = mode
        self.totalDuration = totalDuration
    }
}
`;
}

function generateLiveActivityView(appGroup) {
  return `import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - App Logo Component
struct AppLogoView: View {
    let size: CGFloat
    
    var body: some View {
        ZStack {
            // Outer glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color(red: 1.0, green: 0.55, blue: 0.0).opacity(0.5),
                            Color.clear
                        ],
                        center: .center,
                        startRadius: size * 0.3,
                        endRadius: size * 0.7
                    )
                )
                .frame(width: size * 1.3, height: size * 1.3)
            
            // Main orb with gradient
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color(red: 1.0, green: 0.9, blue: 0.5),
                            Color(red: 1.0, green: 0.6, blue: 0.15),
                            Color(red: 0.95, green: 0.4, blue: 0.05)
                        ],
                        center: UnitPoint(x: 0.3, y: 0.3),
                        startRadius: 0,
                        endRadius: size * 0.55
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: Color(red: 1.0, green: 0.5, blue: 0.0).opacity(0.6), radius: size * 0.15, x: 0, y: 0)
            
            // Inner highlight
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color.white.opacity(0.85),
                            Color.white.opacity(0.0)
                        ],
                        center: UnitPoint(x: 0.35, y: 0.35),
                        startRadius: 0,
                        endRadius: size * 0.3
                    )
                )
                .frame(width: size * 0.45, height: size * 0.45)
                .offset(x: -size * 0.1, y: -size * 0.1)
        }
    }
}

// MARK: - Live Activity Widget
struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerActivityAttributes.self) { context in
            // Lock Screen / Notification Center View
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded View
                DynamicIslandExpandedRegion(.leading) {
                    ExpandedLeadingView(context: context)
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedTrailingView(context: context)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(context: context)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    EmptyView()
                }
            } compactLeading: {
                // Compact Leading - App Icon
                AppLogoView(size: 24)
                    .frame(width: 28, height: 28)
            } compactTrailing: {
                // Compact Trailing - Timer
                CompactTrailingView(context: context)
            } minimal: {
                // Minimal - Just the icon
                AppLogoView(size: 22)
                    .frame(width: 26, height: 26)
            }
            .widgetURL(URL(string: "myapp://timer"))
            .keylineTint(context.attributes.modeColor)
        }
    }
}

// MARK: - Compact Trailing View
struct CompactTrailingView: View {
    let context: ActivityViewContext<TimerActivityAttributes>
    
    var body: some View {
        if context.state.isPaused {
            Image(systemName: "pause.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(context.attributes.modeColor)
        } else {
            Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(context.attributes.modeColor)
                .monospacedDigit()
                .frame(minWidth: 48)
                .multilineTextAlignment(.center)
        }
    }
}

// MARK: - Expanded Leading View
struct ExpandedLeadingView: View {
    let context: ActivityViewContext<TimerActivityAttributes>
    
    var body: some View {
        HStack(spacing: 12) {
            AppLogoView(size: 36)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(context.attributes.timerName)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                
                Text(context.state.isPaused ? "Paused" : "In Progress")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
    }
}

// MARK: - Expanded Trailing View
struct ExpandedTrailingView: View {
    let context: ActivityViewContext<TimerActivityAttributes>
    
    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            if context.state.isPaused {
                Image(systemName: "pause.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(context.attributes.modeColor.opacity(0.7))
                
                Text("--:--")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(context.attributes.modeColor)
                    .monospacedDigit()
            } else {
                Text("remaining")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
                
                Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(context.attributes.modeColor)
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
            }
        }
    }
}

// MARK: - Expanded Bottom View
struct ExpandedBottomView: View {
    let context: ActivityViewContext<TimerActivityAttributes>
    
    var body: some View {
        VStack(spacing: 10) {
            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.12))
                        .frame(height: 5)
                    
                    Capsule()
                        .fill(context.attributes.modeGradient)
                        .frame(width: max(0, geometry.size.width * context.state.progress), height: 5)
                }
            }
            .frame(height: 5)
            
            // Bottom Info
            HStack {
                HStack(spacing: 5) {
                    Image(systemName: context.attributes.modeIcon)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(context.attributes.modeColor)
                    
                    Text(context.state.isPaused ? "Tap to resume" : "Stay focused")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.65))
                }
                
                Spacer()
                
                Text("\\(Int(context.state.progress * 100))%")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(context.attributes.modeColor)
            }
        }
        .padding(.top, 6)
    }
}

// MARK: - Lock Screen View
struct LockScreenView: View {
    let context: ActivityViewContext<TimerActivityAttributes>
    
    var body: some View {
        HStack(spacing: 16) {
            // Left - Logo and Info
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .stroke(context.attributes.modeGradient, lineWidth: 2.5)
                        .frame(width: 54, height: 54)
                    
                    AppLogoView(size: 42)
                }
                
                VStack(alignment: .leading, spacing: 5) {
                    Text(context.attributes.timerName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    
                    // Mini progress bar
                    HStack(spacing: 8) {
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.white.opacity(0.18))
                                    .frame(height: 4)
                                
                                Capsule()
                                    .fill(context.attributes.modeGradient)
                                    .frame(width: max(0, geometry.size.width * context.state.progress), height: 4)
                            }
                        }
                        .frame(width: 65, height: 4)
                        
                        Text(context.state.isPaused ? "Paused" : "\\(Int(context.state.progress * 100))%")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            
            Spacer()
            
            // Right - Timer
            VStack(alignment: .trailing, spacing: 3) {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.5))
                    
                    Text("--:--")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundColor(context.attributes.modeColor)
                        .monospacedDigit()
                } else {
                    Text("remaining")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.45))
                    
                    Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundColor(context.attributes.modeColor)
                        .monospacedDigit()
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.06, green: 0.06, blue: 0.08),
                        Color(red: 0.04, green: 0.04, blue: 0.05)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                RadialGradient(
                    colors: [
                        context.attributes.modeColor.opacity(0.12),
                        Color.clear
                    ],
                    center: .leading,
                    startRadius: 0,
                    endRadius: 220
                )
            }
        )
        .activityBackgroundTint(Color.black.opacity(0.85))
    }
}

// MARK: - Attributes Extension
extension TimerActivityAttributes {
    var modeIcon: String {
        switch mode {
        case "focus": return "flame.fill"
        case "shortBreak": return "cup.and.saucer.fill"
        case "longBreak": return "leaf.fill"
        default: return "timer"
        }
    }
    
    var modeColor: Color {
        switch mode {
        case "focus": return Color(red: 1.0, green: 0.78, blue: 0.15)
        case "shortBreak": return Color(red: 0.25, green: 0.88, blue: 0.72)
        case "longBreak": return Color(red: 0.58, green: 0.48, blue: 1.0)
        default: return .white
        }
    }
    
    var modeGradient: LinearGradient {
        switch mode {
        case "focus":
            return LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.65, blue: 0.15),
                    Color(red: 1.0, green: 0.45, blue: 0.2)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case "shortBreak":
            return LinearGradient(
                colors: [
                    Color(red: 0.15, green: 0.92, blue: 0.72),
                    Color(red: 0.05, green: 0.72, blue: 0.62)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case "longBreak":
            return LinearGradient(
                colors: [
                    Color(red: 0.62, green: 0.45, blue: 1.0),
                    Color(red: 0.42, green: 0.25, blue: 0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        default:
            return LinearGradient(colors: [.white], startPoint: .top, endPoint: .bottom)
        }
    }
}
`;
}

function generateNativeModule(appGroup) {
  return `import Foundation
import ActivityKit
import React

@available(iOS 16.1, *)
@objc(LiveActivityModule)
class LiveActivityModule: RCTEventEmitter {
    
    private var currentActivity: Activity<TimerActivityAttributes>?
    private var hasListeners = false
    
    override init() {
        super.init()
    }
    
    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["LiveActivityAction", "LiveActivityStateChange"]
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    // MARK: - Check if Live Activities are supported
    @objc func isSupported(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            let supported = ActivityAuthorizationInfo().areActivitiesEnabled
            resolve(["supported": supported])
        } else {
            resolve(["supported": false])
        }
    }
    
    // MARK: - Start Live Activity
    @objc func startActivity(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("DISABLED", "Live Activities are disabled", nil)
            return
        }
        
        let timerName = params["timerName"] as? String ?? "Focus Session"
        let mode = params["mode"] as? String ?? "focus"
        let totalDuration = params["totalDuration"] as? Int ?? 1500
        let remainingTime = params["remainingTime"] as? Int ?? totalDuration
        let endTimeUnix = params["endTime"] as? Double ?? (Date().timeIntervalSince1970 + Double(remainingTime))
        let isPaused = params["isPaused"] as? Bool ?? false
        let progress = params["progress"] as? Double ?? 0.0
        
        // End any existing activity first
        if let existing = currentActivity {
            Task {
                await existing.end(dismissalPolicy: .immediate)
            }
            currentActivity = nil
        }
        
        let attributes = TimerActivityAttributes(
            timerName: timerName,
            mode: mode,
            totalDuration: totalDuration
        )
        
        let endTime = Date(timeIntervalSince1970: endTimeUnix)
        let initialState = TimerActivityAttributes.ContentState(
            remainingTime: remainingTime,
            isPaused: isPaused,
            progress: progress,
            endTime: endTime
        )
        
        do {
            let activityContent = ActivityContent(state: initialState, staleDate: nil)
            let activity = try Activity.request(
                attributes: attributes,
                content: activityContent,
                pushType: nil
            )
            
            currentActivity = activity
            
            print("[LiveActivityModule] Started activity: \\(activity.id)")
            resolve(["activityId": activity.id, "success": true])
            
            // Monitor activity state
            Task {
                for await state in activity.activityStateUpdates {
                    print("[LiveActivityModule] State changed: \\(state)")
                    if state == .dismissed || state == .ended {
                        self.currentActivity = nil
                    }
                }
            }
            
        } catch {
            print("[LiveActivityModule] Failed to start: \\(error)")
            reject("START_ERROR", error.localizedDescription, error)
        }
    }
    
    // MARK: - Update Live Activity
    @objc func updateActivity(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        guard let activity = currentActivity else {
            // Try to find existing activity
            let activities = Activity<TimerActivityAttributes>.activities
            if let first = activities.first {
                currentActivity = first
            } else {
                reject("NO_ACTIVITY", "No active Live Activity found", nil)
                return
            }
        }
        
        let remainingTime = params["remainingTime"] as? Int ?? 0
        let isPaused = params["isPaused"] as? Bool ?? false
        let progress = params["progress"] as? Double ?? 0.0
        let endTimeUnix = params["endTime"] as? Double ?? Date().timeIntervalSince1970
        
        let endTime = Date(timeIntervalSince1970: endTimeUnix)
        let newState = TimerActivityAttributes.ContentState(
            remainingTime: remainingTime,
            isPaused: isPaused,
            progress: progress,
            endTime: endTime
        )
        
        Task {
            let content = ActivityContent(state: newState, staleDate: nil)
            await currentActivity?.update(content)
            print("[LiveActivityModule] Updated: remaining=\\(remainingTime), paused=\\(isPaused)")
            resolve(["success": true])
        }
    }
    
    // MARK: - End Live Activity
    @objc func endActivity(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        let completed = params["completed"] as? Bool ?? true
        
        Task {
            // End current activity
            if let activity = currentActivity {
                let finalState = TimerActivityAttributes.ContentState(
                    remainingTime: 0,
                    isPaused: false,
                    progress: 1.0,
                    endTime: Date()
                )
                let content = ActivityContent(state: finalState, staleDate: nil)
                await activity.end(content, dismissalPolicy: .immediate)
                currentActivity = nil
                print("[LiveActivityModule] Ended activity, completed=\\(completed)")
            }
            
            // Also end any other lingering activities
            for activity in Activity<TimerActivityAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }
            
            resolve(["success": true])
        }
    }
    
    // MARK: - Get Activity Status
    @objc func getActivityStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            resolve(["isActive": false, "supported": false])
            return
        }
        
        let activities = Activity<TimerActivityAttributes>.activities
        let isActive = !activities.isEmpty || currentActivity != nil
        
        resolve([
            "isActive": isActive,
            "supported": ActivityAuthorizationInfo().areActivitiesEnabled,
            "count": activities.count
        ])
    }
    
    // MARK: - End All Activities
    @objc func endAllActivities(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            resolve(["success": true])
            return
        }
        
        Task {
            for activity in Activity<TimerActivityAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }
            currentActivity = nil
            print("[LiveActivityModule] Ended all activities")
            resolve(["success": true])
        }
    }
}

// Fallback for older iOS versions
@available(iOS, deprecated: 16.1)
@objc(LiveActivityModule)
class LiveActivityModuleFallback: RCTEventEmitter {
    
    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["LiveActivityAction"]
    }
    
    @objc func isSupported(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(["supported": false])
    }
    
    @objc func startActivity(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        reject("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
    }
    
    @objc func updateActivity(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        reject("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
    }
    
    @objc func endActivity(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(["success": true])
    }
    
    @objc func getActivityStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(["isActive": false, "supported": false])
    }
    
    @objc func endAllActivities(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(["success": true])
    }
}
`;
}

function generateBridgingHeader() {
  return `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(LiveActivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(isSupported:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)params
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(NSDictionary *)params
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endActivity:(NSDictionary *)params
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getActivityStatus:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endAllActivities:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
`;
}

function generateEntitlements(appGroup) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${appGroup}</string>
    </array>
</dict>
</plist>
`;
}

function generateInfoPlist(bundleId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>GoalForge Timer</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>${bundleId}${WIDGET_BUNDLE_ID_SUFFIX}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
`;
}

module.exports = withLiveActivity;
