#import "RNXAuthMSALModule.h"

#import <TargetConditionals.h>

#if TARGET_OS_OSX
#import <AppKit/NSViewController.h>
typedef NSViewController RTAViewController;
#else
#import <UIKit/UIKit.h>
typedef UIViewController RTAViewController;
#endif  // TARGET_OS_OSX

#import <RNXAuth/RNXAccountType.h>
#import <RNXAuth/RNXAuthError.h>
#import <RNXAuth/RNXAuthErrorType.h>
#import <RNXAuth/RNXAuthResult.h>

#import "ReactTestApp_MSAL-Swift.h"

RNXAuthErrorType RNXAuthErrorTypeFromAuthErrorType(AuthErrorType type);
AccountType RTAMSALAccountTypeFromRNXAccountType(RNXAccountType type);
RTAViewController *RTAMSALFindPresentedViewController(void);

@implementation RNXAuthMSALModule

RCT_EXPORT_MODULE(RNXAuth)

- (void)acquireTokenWithResources:(nonnull NSArray<NSString *> *)scopes
             userPrincipalName:(nonnull NSString *)userPrincipalName
                   accountType:(RNXAccountType)accountType
               onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
{
  onTokenAcquired(nil, [RNXAuthError errorWithType:RNXAuthErrorTypeNotImplemented
                                     correlationID:@"00000000-0000-0000-0000-000000000000"
                                           message:@"AcquireTokenWithResource: has not been implemented."]);
}

- (void)acquireTokenWithScopes:(nonnull NSArray<NSString *> *)scopes
             userPrincipalName:(nonnull NSString *)userPrincipalName
                   accountType:(RNXAccountType)accountType
               onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
{
    if (![NSThread isMainThread]) {
        dispatch_async(dispatch_get_main_queue(), ^{
          [self acquireTokenWithScopes:scopes
                     userPrincipalName:userPrincipalName
                           accountType:accountType
                       onTokenAcquired:onTokenAcquired];
        });
        return;
    }

    [TokenBroker.sharedBroker
        acquireTokenWithScopes:scopes
             userPrincipalName:userPrincipalName
                   accountType:RTAMSALAccountTypeFromRNXAccountType(accountType)
                        sender:RTAMSALFindPresentedViewController()
               onTokenAcquired:^(AuthResult *result, AuthError *error) {
                 if (result == nil) {
                     RNXAuthError *e =
                         [RNXAuthError errorWithType:RNXAuthErrorTypeFromAuthErrorType(error.type)
                                       correlationID:error.correlationID
                                             message:error.message];
                     onTokenAcquired(nil, e);
                 } else {
                     RNXAuthResult *authResult =
                         [RNXAuthResult resultWithAccessToken:result.accessToken
                                               expirationTime:result.expirationTime
                                                  redirectURI:result.redirectURI];
                     onTokenAcquired(authResult, nil);
                 }
               }];
}

@end

RNXAuthErrorType RNXAuthErrorTypeFromAuthErrorType(AuthErrorType type)
{
    switch (type) {
        case AuthErrorTypeUnknown:
            return RNXAuthErrorTypeUnknown;
        case AuthErrorTypeBadRefreshToken:
            return RNXAuthErrorTypeBadRefreshToken;
        case AuthErrorTypeConditionalAccessBlocked:
            return RNXAuthErrorTypeConditionalAccessBlocked;
        case AuthErrorTypeInteractionRequired:
            return RNXAuthErrorTypeInteractionRequired;
        case AuthErrorTypeNoResponse:
            return RNXAuthErrorTypeNoResponse;
        case AuthErrorTypePreconditionViolated:
            return RNXAuthErrorTypePreconditionViolated;
        case AuthErrorTypeServerDeclinedScopes:
            return RNXAuthErrorTypeServerDeclinedScopes;
        case AuthErrorTypeServerProtectionPoliciesRequired:
            return RNXAuthErrorTypeServerProtectionPoliciesRequired;
        case AuthErrorTypeTimeout:
            return RNXAuthErrorTypeTimeout;
        case AuthErrorTypeUserCanceled:
            return RNXAuthErrorTypeUserCanceled;
        case AuthErrorTypeWorkplaceJoinRequired:
            return RNXAuthErrorTypeWorkplaceJoinRequired;
    }
}

AccountType RTAMSALAccountTypeFromRNXAccountType(RNXAccountType type)
{
    switch (type) {
        case RNXAccountTypeMicrosoftAccount:
            return AccountTypeMicrosoftAccount;
        case RNXAccountTypeOrganizational:
            return AccountTypeOrganizational;
        default:
            return AccountTypeInvalid;
    }
}

RTAViewController *RTAMSALFindPresentedViewController(void)
{
#if TARGET_OS_OSX
    return nil;
#else
    NSEnumerator *enumerator = [UIApplication.sharedApplication.connectedScenes objectEnumerator];
    UIScene *scene;
    while ((scene = [enumerator nextObject])) {
        if ([scene isKindOfClass:[UIWindowScene class]]) {
            for (UIWindow *window in [(UIWindowScene *)scene windows]) {
                if (window.isKeyWindow) {
                    UIViewController *rootViewController = window.rootViewController;
                    if ([rootViewController isKindOfClass:[UINavigationController class]]) {
                        return [(UINavigationController *)rootViewController visibleViewController];
                    } else {
                        return window.rootViewController.presentedViewController;
                    }
                }
            }
        }
    }

    return nil;
#endif  // TARGET_OS_OSX
}
