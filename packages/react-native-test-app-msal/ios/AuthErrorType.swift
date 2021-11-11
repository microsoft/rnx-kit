import Foundation
import MSAL

@objc
public enum AuthErrorType: Int {
    case unknown
    case badRefreshToken
    case conditionalAccessBlocked
    case interactionRequired
    case noResponse
    case preconditionViolated
    case serverDeclinedScopes
    case serverProtectionPoliciesRequired
    case timeout
    case userCanceled
    case workplaceJoinRequired

    public init(_ errorCode: MSALError) {
        switch errorCode {
        case .internal:
            self = .unknown
        case .interactionRequired:
            self = .interactionRequired
        case .serverDeclinedScopes:
            self = .serverDeclinedScopes
        case .serverProtectionPoliciesRequired:
            self = .serverProtectionPoliciesRequired
        case .userCanceled:
            self = .userCanceled
        case .workplaceJoinRequired:
            self = .workplaceJoinRequired
        default:
            self = .unknown
        }
    }
}
