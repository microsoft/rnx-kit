#import "RNXAuthModule.h"

#import "RNXAuthError.h"
#import "RNXAuthResult.h"

@implementation RNXAuthModule

+ (NSString *)moduleName
{
    return @"RNXAuth";
}

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (void)acquireTokenWithResource:(NSString *)resource
               userPrincipalName:(NSString *)userPrincipalName
                     accountType:(RNXAccountType)accountType
                 onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
{
    NSAssert(NO, @"%@ has not been implemented", NSStringFromSelector(_cmd));
}

- (void)acquireTokenWithScopes:(NSArray<NSString *> *)scopes
             userPrincipalName:(NSString *)userPrincipalName
                   accountType:(RNXAccountType)accountType
               onTokenAcquired:(TokenAcquiredHandler)onTokenAcquired
{
    NSAssert(NO, @"%@ has not been implemented", NSStringFromSelector(_cmd));
}

/**
 * @code
 * // index.ts
 * type AccountType = "MicrosoftAccount" | "Organizational";
 *
 * type AuthErrorType =
 *   | "Unknown"
 *   | "BadRefreshToken"
 *   | "ConditionalAccessBlocked"
 *   | "NoResponse"
 *   | "PolicyRequiredError"
 *   | "PreconditionViolated"
 *   | "Timeout";
 *
 * type AuthError = {
 *   type: AuthErrorType;
 *   correlationId: string;
 *   message?: string;
 * };
 *
 * type AuthResult = {
 *   accessToken: string;
 *   expirationTime: number;
 *   redirectUri?: string
 * };
 *
 * function acquireTokenWithResource(
 *   resource: string,
 *   userPrincipalName: string,
 *   accountType: AccountType,
 * ): Promise<AuthResult>;
 *
 * function acquireTokenWithScopes(
 *   scopes: string[],
 *   userPrincipalName: string,
 *   accountType: AccountType,
 * ): Promise<AuthResult>;
 * @endcode
 */

// clang-format off
RCT_EXPORT_METHOD(acquireTokenWithResource:(NSString *)resource
                         userPrincipalName:(NSString *)userPrincipalName
                               accountType:(NSString *)accountType
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject)
// clang-format on
{
    [self acquireTokenWithResource:resource
                 userPrincipalName:userPrincipalName
                       accountType:RNXAccountTypeFromString(accountType)
                   onTokenAcquired:^(RNXAuthResult *result, RNXAuthError *error) {
                     if (result == nil) {
                         reject(RNXStringFromAuthErrorType(error.type),
                                error.message,
                                [NSError errorWithAuthError:error]);
                     } else {
                         resolve([result dictionary]);
                     }
                   }];
}

// clang-format off
RCT_EXPORT_METHOD(acquireTokenWithScopes:(NSArray<NSString *> *)scopes
                       userPrincipalName:(NSString *)userPrincipalName
                             accountType:(NSString *)accountType
                                resolver:(RCTPromiseResolveBlock)resolve
                                rejecter:(RCTPromiseRejectBlock)reject)
// clang-format on
{
    [self acquireTokenWithScopes:scopes
               userPrincipalName:userPrincipalName
                     accountType:RNXAccountTypeFromString(accountType)
                 onTokenAcquired:^(RNXAuthResult *result, RNXAuthError *error) {
                   if (result == nil) {
                       reject(RNXStringFromAuthErrorType(error.type),
                              error.message,
                              [NSError errorWithAuthError:error]);
                   } else {
                       resolve([result dictionary]);
                   }
                 }];
}

@end
