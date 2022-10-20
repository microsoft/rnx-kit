#import <Foundation/Foundation.h>

#import <RNXAuth/RNXAccountType.h>
#import <React/RCTBridgeModule.h>

@class RNXAuthError;
@class RNXAuthResult;

NS_ASSUME_NONNULL_BEGIN

typedef void (^TokenAcquiredHandler)(RNXAuthResult *_Nullable result,
                                     RNXAuthError *_Nullable error);

/**
 * A partial implementation of the RNXAuth native module. Implementers of this
 * module must implement all public methods, and register itself as `RNXAuth`.
 *
 * An example implementation can be found in `react-native-test-app-msal`:
 *
 * @code
 * // ios/RNXAuthMSALModule.h
 * #import <Foundation/Foundation.h>
 *
 * #import <RNXAuth/RNXAuthModule.h>
 *
 * @interface RNXAuthMSALModule : RNXAuthModule
 *
 * @end
 *
 * // ios/RNXAuthMSALModule.m
 * #import "RNXAuthMSALModule.h"
 *
 * @implementation RNXAuthMSALModule
 *
 * RCT_EXPORT_MODULE(RNXAuth)  // Important to export module as `RNXAuth`
 *
 * - (void)acquireTokenWithScopes:(nonnull NSArray<NSString *> *)scopes
 *              userPrincipalName:(nonnull NSString *)userPrincipalName
 *                    accountType:(RNXAccountType)accountType
 *                onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
 * {
 *     // Implement me!
 * }
 *
 * @end
 * @endcode
 */
@interface RNXAuthModule : NSObject <RCTBridgeModule>

- (void)acquireTokenWithResource:(NSString *)resource
               userPrincipalName:(NSString *)userPrincipalName
                     accountType:(RNXAccountType)accountType
                 onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
    NS_SWIFT_NAME(acquireToken(resource:userPrincipalName:accountType:onTokenAcquired:));

- (void)acquireTokenWithScopes:(NSArray<NSString *> *)scopes
             userPrincipalName:(NSString *)userPrincipalName
                   accountType:(RNXAccountType)accountType
               onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
    NS_SWIFT_NAME(acquireToken(scopes:userPrincipalName:accountType:onTokenAcquired:));

@end

NS_ASSUME_NONNULL_END
