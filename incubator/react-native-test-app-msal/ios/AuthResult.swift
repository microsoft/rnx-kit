import Foundation
import MSAL

@objcMembers
public final class AuthResult: NSObject {
    public let accessToken: String
    public let username: String
    public let expirationTime: Int
    public let redirectURI: String?

    public init(accessToken: String, username: String, expirationTime: Int, redirectURI: String? = nil) {
        self.accessToken = accessToken
        self.username = username
        self.expirationTime = expirationTime
        self.redirectURI = redirectURI
    }
}

extension AuthResult {
    convenience init(result: MSALResult) {
        self.init(
            accessToken: result.accessToken,
            username: result.account.username ?? "",
            expirationTime: Int(result.expiresOn?.timeIntervalSince1970 ?? 0),
            redirectURI: TokenBroker.Constants.RedirectURI
        )
    }
}
