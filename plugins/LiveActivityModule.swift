import Foundation
import ActivityKit
import React

@objc(LiveActivityModule)
class LiveActivityModule: RCTEventEmitter {
    
    private var currentActivity: Activity<TimerActivityAttributes>?
    
    override init() {
        super.init()
    }
    
    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["LiveActivityAction", "LiveActivityStateChange"]
    }
    
    // MARK: - Start Activity
    @objc func startActivity(_ params: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            rejecter("DISABLED", "Live Activities are disabled", nil)
            return
        }
        
        let timerName = params["timerName"] as? String ?? "Focus Session"
        let mode = params["mode"] as? String ?? "focus"
        let totalDuration = params["totalDuration"] as? Int ?? 1500
        let remainingTime = params["remainingTime"] as? Int ?? 1500
        let endTimeUnix = params["endTime"] as? Double ?? (Date().timeIntervalSince1970 + Double(remainingTime))
        let isPaused = params["isPaused"] as? Bool ?? false
        let progress = params["progress"] as? Double ?? 0.0
        
        let endTime = Date(timeIntervalSince1970: endTimeUnix)
        
        let attributes = TimerActivityAttributes(
            timerName: timerName,
            mode: mode,
            totalDuration: totalDuration
        )
        
        let contentState = TimerActivityAttributes.ContentState(
            remainingTime: remainingTime,
            isPaused: isPaused,
            progress: progress,
            endTime: endTime
        )
        
        do {
            // End any existing activity first
            if let existingActivity = currentActivity {
                Task {
                    await existingActivity.end(dismissalPolicy: .immediate)
                }
            }
            
            let activityContent = ActivityContent(state: contentState, staleDate: nil)
            let activity = try Activity.request(
                attributes: attributes,
                content: activityContent,
                pushType: nil
            )
            
            currentActivity = activity
            
            print("[LiveActivityModule] Started activity: \(activity.id)")
            
            resolver([
                "activityId": activity.id,
                "success": true
            ])
            
        } catch {
            print("[LiveActivityModule] Failed to start activity: \(error)")
            rejecter("START_FAILED", "Failed to start Live Activity: \(error.localizedDescription)", error)
        }
    }
    
    // MARK: - Update Activity
    @objc func updateActivity(_ params: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        guard let activity = currentActivity else {
            rejecter("NO_ACTIVITY", "No active Live Activity to update", nil)
            return
        }
        
        let remainingTime = params["remainingTime"] as? Int ?? 0
        let isPaused = params["isPaused"] as? Bool ?? false
        let progress = params["progress"] as? Double ?? 0.0
        let endTimeUnix = params["endTime"] as? Double ?? Date().timeIntervalSince1970
        
        let endTime = Date(timeIntervalSince1970: endTimeUnix)
        
        let updatedState = TimerActivityAttributes.ContentState(
            remainingTime: remainingTime,
            isPaused: isPaused,
            progress: progress,
            endTime: endTime
        )
        
        Task {
            let activityContent = ActivityContent(state: updatedState, staleDate: nil)
            await activity.update(activityContent)
            
            print("[LiveActivityModule] Updated activity: remaining=\(remainingTime), paused=\(isPaused), progress=\(progress)")
            
            DispatchQueue.main.async {
                resolver([
                    "success": true,
                    "activityId": activity.id
                ])
            }
        }
    }
    
    // MARK: - End Activity
    @objc func endActivity(_ params: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        guard let activity = currentActivity else {
            // No activity to end, but that's okay
            resolver(["success": true])
            return
        }
        
        let completed = params["completed"] as? Bool ?? true
        
        Task {
            // Create a final state showing completion
            let finalState = TimerActivityAttributes.ContentState(
                remainingTime: 0,
                isPaused: false,
                progress: 1.0,
                endTime: Date()
            )
            
            let finalContent = ActivityContent(state: finalState, staleDate: nil)
            
            // Dismiss after a short delay so user sees completion
            await activity.end(finalContent, dismissalPolicy: completed ? .after(.now + 5) : .immediate)
            
            print("[LiveActivityModule] Ended activity, completed: \(completed)")
            
            DispatchQueue.main.async { [weak self] in
                self?.currentActivity = nil
                resolver(["success": true])
            }
        }
    }
    
    // MARK: - Get Activity Status
    @objc func getActivityStatus(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            resolver(["isActive": false, "isSupported": false])
            return
        }
        
        let isEnabled = ActivityAuthorizationInfo().areActivitiesEnabled
        let isActive = currentActivity != nil
        
        resolver([
            "isActive": isActive,
            "isSupported": true,
            "isEnabled": isEnabled,
            "activityId": currentActivity?.id ?? NSNull()
        ])
    }
    
    // MARK: - End All Activities
    @objc func endAllActivities(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            resolver(["success": true])
            return
        }
        
        Task {
            for activity in Activity<TimerActivityAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }
            
            DispatchQueue.main.async { [weak self] in
                self?.currentActivity = nil
                resolver(["success": true])
            }
        }
    }
}
