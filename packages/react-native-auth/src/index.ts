import NativeAuth, { getEnforcing } from "./NativeAuth";
import type { AccountType, AuthResult } from "./types";

export type {
  AccountType,
  AuthErrorAndroid,
  AuthErrorBase,
  AuthErrorIOS,
  AuthErrorNative,
  AuthErrorType,
  AuthErrorUserInfo,
  AuthResult,
} from "./types";

/**
 * Acquires a token for a resource.
 *
 * @note This function may return a cached token.
 *
 * @param resource Resource to acquire a token for.
 * @param userPrincipalName The user principal name to acquire a token for. Typically an email address.
 * @param accountType Account type, i.e. a consumer account or a work/school account.
 * @throws {AuthErrorNative}
 * @returns The access token and related meta data.
 */
export function acquireTokenWithResource(
  resource: string,
  userPrincipalName: string,
  accountType: AccountType
): Promise<AuthResult> {
  return getEnforcing().acquireTokenWithResource(
    resource,
    userPrincipalName,
    accountType
  );
}

/**
 * Acquires a token with specified scopes.
 *
 * @note This function may return a cached token.
 *
 * @param scopes Permission scopes to acquire a token for.
 * @param userPrincipalName The user principal name to acquire a token for. Typically an email address.
 * @param accountType Account type, i.e. a consumer account or a work/school account.
 * @throws {AuthErrorNative}
 * @returns The access token and related meta data.
 */
export function acquireTokenWithScopes(
  scopes: string[],
  userPrincipalName: string,
  accountType: AccountType
): Promise<AuthResult> {
  return getEnforcing().acquireTokenWithScopes(
    scopes,
    userPrincipalName,
    accountType
  );
}

/**
 * Returns whether this module is available.
 */
export function isAvailable(): boolean {
  return Boolean(NativeAuth);
}
