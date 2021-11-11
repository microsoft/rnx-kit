import { NativeModules } from "react-native";

if (!NativeModules.RNXAuth) {
  throw new Error(
    "`RNXAuth` native module is missing. Please make sure it was correctly linked."
  );
}

export type AccountType = "MicrosoftAccount" | "Organizational";

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

export type AuthError = {
  type: AuthErrorType;
  correlationId: string;
  message?: string;
};

export type AuthErrorAndroid = {
  code: AuthErrorType;
  message: string;
  userInfo: AuthError;
  nativeStackAndroid?: string[];
};

export type AuthErrorIOS = {
  code: AuthErrorType;
  message?: string;
  domain: "RNX_AUTH";
  userInfo: AuthError;
  nativeStackIOS?: string[];
};

export type AuthErrorNative = AuthErrorAndroid | AuthErrorIOS;

export type AuthResult = {
  accessToken: string;
  expirationTime: number;
  redirectUri?: string;
};

/**
 * Acquires a token with specified scopes.
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
