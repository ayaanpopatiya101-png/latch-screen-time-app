#import <React/RCTBridgeModule.h>

// Objective-C bridge macro — all actual implementation is in Swift.
RCT_EXTERN_MODULE(ScreenTimeIOS, NSObject)

RCT_EXTERN_METHOD(
  requestAuthorization:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getAuthorizationStatus:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getTodayUsage:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  startShield:(NSArray<NSString *> *)bundleIds
  mode:(NSString *)mode
  endsAt:(double)endsAt
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  stopShield:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  scheduleActivity:(NSString *)activityName
  startHour:(NSInteger)startHour
  startMinute:(NSInteger)startMinute
  endHour:(NSInteger)endHour
  endMinute:(NSInteger)endMinute
  bundleIds:(NSArray<NSString *> *)bundleIds
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  cancelActivity:(NSString *)activityName
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)
