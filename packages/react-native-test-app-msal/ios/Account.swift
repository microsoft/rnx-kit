@objc
public enum AccountType: Int, CaseIterable {
    case microsoftAccount
    case organizational
}

@objc
public final class Account: NSObject, Identifiable {
    // swiftlint:disable:next identifier_name
    public var id: String {
        "\(accountType.description):\(userPrincipalName)"
    }

    let userPrincipalName: String
    let accountType: AccountType

    init(userPrincipalName: String, accountType: AccountType) {
        self.userPrincipalName = userPrincipalName
        self.accountType = accountType
    }
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

extension Array where Element: Account {
    func find(userPrincipalName: String, accountType: AccountType) -> Account? {
        first {
            $0.accountType == accountType && $0.userPrincipalName == userPrincipalName
        }
    }

    func find(string: String) -> Account? {
        let components = string.split(
            separator: ":",
            maxSplits: 1,
            omittingEmptySubsequences: false
        )
        return find(
            userPrincipalName: String(components[1]),
            accountType: AccountType.from(string: String(components[0]))
        )
    }
}
