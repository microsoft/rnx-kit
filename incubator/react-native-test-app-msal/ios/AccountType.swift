import Foundation

@objc
public enum AccountType: Int, CaseIterable {
    case invalid
    case microsoftAccount
    case organizational
}

extension AccountType {
    enum Constants {
        // Source: https://docs.microsoft.com/en-us/azure/active-directory/develop/id-tokens
        static let MicrosoftAccountTenant = "9188040d-6c67-4c5b-b112-36a304b66dad"
    }

    static func from(issuer: String) -> AccountType {
        issuer.contains(Constants.MicrosoftAccountTenant)
            ? .microsoftAccount
            : .organizational
    }

    static func from(string: String) -> AccountType {
        allCases.first { $0.description == string } ?? .organizational
    }

    var description: String {
        switch self {
        case .invalid:
            return "invalid"
        case .microsoftAccount:
            return "personal"
        case .organizational:
            return "work"
        }
    }
}
