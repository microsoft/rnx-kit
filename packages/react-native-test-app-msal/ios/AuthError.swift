import Foundation
import MSAL

@objcMembers
public final class AuthError: NSObject {
    public let type: AuthErrorType
    public let correlationID: String
    public let message: String?

    public init(type: AuthErrorType, correlationID: String, message: String? = nil) {
        self.type = type
        self.correlationID = correlationID
        self.message = message
    }
}

extension AuthError {
    convenience init(error: NSError?) {
        if let error = error {
            let correlationID = error.userInfo[MSALCorrelationIDKey] as? String
            let message = error.userInfo[MSALErrorDescriptionKey] as? String
            self.init(
                type: AuthErrorType(MSALError(rawValue: error.code) ?? .internal),
                correlationID: correlationID ?? TokenBroker.Constants.EmptyGUID,
                message: message ?? error.localizedDescription
            )
        } else {
            self.init(type: .unknown, correlationID: TokenBroker.Constants.EmptyGUID)
        }
    }
}
