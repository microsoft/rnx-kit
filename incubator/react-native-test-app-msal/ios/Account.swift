import Foundation

@objc
public final class Account: NSObject, Identifiable {
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
