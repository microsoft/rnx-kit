import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";
import type { AuthResult } from "./types";

/**
 * We re-declare `AccountType` here as a `string` because codegen currently does
 * not understand string literal unions. The workaround is to use string enums,
 * but that has a runtime cost and bloats the bundle size. The following:
 *
 *     ```ts
 *     export enum AccountTypeOption {
 *       MicrosoftAccount = 'MicrosoftAccount',
 *       Organizational = 'Organizational',
 *     }
 *     ```
 *
 * is transpiled to:
 *
 *     ```js
 *     exports.AccountTypeOption = void 0;
 *     var AccountTypeOption;
 *     (function (AccountTypeOption) {
 *         AccountTypeOption["MicrosoftAccount"] = "MicrosoftAccount";
 *         AccountTypeOption["Organizational"] = "Organizational";
 *     })(AccountTypeOption = exports.AccountTypeOption || (exports.AccountTypeOption = {}));
 *     ```
 *
 * With a string literal union, no code is generated. Additionally, when this
 * runs through codegen, we get:
 *
 *     ```objc
 *     - (void)acquireTokenWithResource:(NSString *)resource
 *                    userPrincipalName:(NSString *)userPrincipalName
 *                          accountType:(NSString *)accountType
 *                              resolve:(RCTPromiseResolveBlock)resolve
 *                               reject:(RCTPromiseRejectBlock)reject;
 *     - (void)acquireTokenWithScopes:(NSArray *)scopes
 *                  userPrincipalName:(NSString *)userPrincipalName
 *                        accountType:(NSString *)accountType
 *                            resolve:(RCTPromiseResolveBlock)resolve
 *                             reject:(RCTPromiseRejectBlock)reject;
 *     ```
 *
 * So we might as well use `string` here.
 */
type AccountType = string;

/**
 * Specification for the native auth module.
 */
export interface Spec extends TurboModule {
  acquireTokenWithResource(
    resource: string,
    userPrincipalName: string,
    accountType: AccountType
  ): Promise<AuthResult>;

  acquireTokenWithScopes(
    scopes: string[],
    userPrincipalName: string,
    accountType: AccountType
  ): Promise<AuthResult>;
}

const AuthModule = TurboModuleRegistry.get<Spec>("RNXAuth");

/**
 * Returns the native auth module.
 * @throws If the native module is not found
 */
export function getEnforcing(): Spec {
  if (!AuthModule) {
    throw new Error(
      "TurboModuleRegistry: 'RNXAuth' could not be found. Verify that a" +
        "module by this name is registered in the native binary."
    );
  }
  return AuthModule;
}

export default AuthModule;
