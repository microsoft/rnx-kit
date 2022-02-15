import { NativeModules } from "react-native";

if (!NativeModules.RNXAuth) {
  throw new Error(
    "`RNXAuth` native module is missing. Please make sure it was correctly linked."
  );
}

/**
 * Microsoft account type. Valid types are Microsoft accounts (or MSA), and
 * organizational (M365).
 */
export type AccountType = "MicrosoftAccount" | "Organizational";

/**
 * The type of error that occurred during authentication.
 */
export type AuthErrorType =
  | "Unknown"
  | "BadRefreshToken"
  | "ConditionalAccessBlocked"
  | "InteractionRequired"
  | "NoResponse"
  | "PreconditionViolated"
  | "ServerDeclinedScopes"
  | "ServerProtectionPoliciesRequired"
  | "Timeout"
  | "UserCanceled"
  | "WorkplaceJoinRequired";

/**
 * Authentication error details provided by the underlying implementation.
 * @property type The type of error that occurred during authentication
 * @property correlationId The unique id for identifying the authentication attempt
 * @property message The error message
 */
export type AuthErrorUserInfo = {
  type: AuthErrorType;
  correlationId: string;
  message?: string;
};

/**
 * Authentication error object thrown by {@link acquireToken}.
 * @property code The type of error that occurred during authentication
 * @property message The error message
 * @property userInfo Error details provided by the underlying implementation
 */
export type AuthErrorBase = {
  code: AuthErrorType;
  message?: string;
  userInfo: AuthErrorUserInfo;
};

/**
 * The authentication error object contains a stack trace on Android.
 * @property nativeStackAndroid Android stack trace
 */
export type AuthErrorAndroid = AuthErrorBase & {
  nativeStackAndroid?: string[];
};

/**
 * The authentication error object contains a stack trace on iOS.
 * @property nativeStackIOS iOS stack trace
 */
export type AuthErrorIOS = AuthErrorBase & {
  domain: "RNX_AUTH";
  nativeStackIOS?: string[];
};

export type AuthErrorNative = AuthErrorAndroid | AuthErrorIOS;

/**
 * Authentication result returned on success.
 * @property accessToken The access token
 * @property expirationTime The time at which the access token expires
 * @property redirectUri The redirect URI that should be used if the access token is forwarded to a second service
 */
export type AuthResult = {
  accessToken: string;
  expirationTime: number;
  redirectUri?: string;
};

/**
 * Acquires a token with specified scopes.
 *
 * Note that this function may return a cached token.
 *
 * @param scopes Permission scopes to acquire a token for.
 * @param userPrincipalName The user principal name to acquire a token for. Typically an email address.
 * @param accountType Account type, i.e. a consumer account or a work/school account.
 * @throws {AuthErrorNative}
 * @returns The access token and related meta data.
 */
export function acquireToken(
  scopes: string[],
  userPrincipalName: string,
  accountType: AccountType
): Promise<AuthResult> {
  return NativeModules.RNXAuth.acquireToken(
    scopes,
    userPrincipalName,
    accountType
  );
}
