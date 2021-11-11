import Foundation

@objc
public enum AccountType: Int, CaseIterable {
    case microsoftAccount
    case organizational
}

extension AccountType {
    static func from(issuer: String) -> AccountType {
        issuer.contains(TokenBroker.Constants.MicrosoftAccountTenant)
            ? .microsoftAccount
            : .organizational
    }

    static func from(string: String) -> AccountType {
        allCases.first { $0.description == string } ?? .organizational
    }

    var authority: URL! {
        switch self {
        case .microsoftAccount:
            return URL(string: "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize")
        case .organizational:
            return URL(string: "https://login.microsoftonline.com/common/")
        }
    }

    var description: String {
        switch self {
        case .microsoftAccount:
            return "personal"
        case .organizational:
            return "work"
        }
    }
}
