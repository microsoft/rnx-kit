import SwiftUI

struct AccountsView: View {
    private lazy var config = Config.load()

    @EnvironmentObject private var hostingController: ObservableHostingController

    @State private var accounts: [Account]
    @State private var didLoad = false
    @State private var formDisabled = false
    @State private var selectAccountType = false

    @State private var selectedAccount: Account? {
        didSet {
            onAccountSelected(selectedAccount)
        }
    }

    init(accounts: [Account] = TokenBroker.shared.allAccounts()) {
        self.accounts = accounts
    }

    var body: some View {
        Form {
            Section {
                Picker("Account:", selection: $selectedAccount) {
                    ForEach(accounts) { account in
                        #if os(iOS)
                            VStack(alignment: .leading) {
                                Text(account.userPrincipalName)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                                Text("Account type: \(account.accountType.description)")
                                    .font(.subheadline)
                                    .foregroundColor(Color.secondary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }
                            .tag(account as Account?)
                        #else
                            Text("\(account.userPrincipalName) (\(account.accountType.description))")
                                .lineLimit(1)
                                .truncationMode(.middle)
                                .tag(account as Account?)
                        #endif
                    }
                    .truncationMode(.middle)
                }
                .onChange(of: selectedAccount) {
                    // `didSet` is not called when selection is changed
                    onAccountSelected($0)
                }
                .disabled(accounts.isEmpty)
                #if os(iOS)
                    Button("Add Account…") { selectAccountType = true }
                        .actionSheet(isPresented: $selectAccountType) {
                            ActionSheet(title: Text("Select account type"), buttons: [
                                .default(Text("Personal")) {
                                    var mutableSelf = self
                                    mutableSelf.onAddAccount(accountType: .microsoftAccount)
                                },
                                .default(Text("Work or School")) {
                                    var mutableSelf = self
                                    mutableSelf.onAddAccount(accountType: .organizational)
                                },
                                .cancel(),
                            ])
                        }
                #else
                    Button("Add Personal Account…") {
                        var mutableSelf = self
                        mutableSelf.onAddAccount(accountType: .microsoftAccount)
                    }
                    Button("Add Work or School Account…") {
                        var mutableSelf = self
                        mutableSelf.onAddAccount(accountType: .organizational)
                    }
                #endif
            }
            if selectedAccount != nil {
                Section {
                    #if os(iOS)
                        if #available(iOS 15.0, macOS 12.0, *) {
                            Button("Sign Out", role: .destructive) { onSignOut() }
                        } else {
                            Button("Sign Out") { onSignOut() }
                                .foregroundColor(Color.red)
                        }
                    #else
                        Button("Sign Out") { onSignOut() }
                            .foregroundColor(Color.red)
                    #endif
                }
            }
            if accounts.count > 1 {
                Section {
                    #if os(iOS)
                        if #available(iOS 15.0, macOS 12.0, *) {
                            Button("Remove All Accounts", role: .destructive) {
                                onRemoveAllAccounts()
                            }
                        } else {
                            Button("Remove All Accounts") { onRemoveAllAccounts() }
                                .foregroundColor(Color.red)
                        }
                    #else
                        Button("Remove All Accounts") { onRemoveAllAccounts() }
                            .foregroundColor(Color.red)
                    #endif
                }
            }
        }
        .onAppear {
            guard !didLoad else {
                return
            }

            defer {
                didLoad = true
            }

            guard let secret = SecretStore.get() else {
                return
            }

            selectedAccount = accounts.find(string: secret)
        }
        .disabled(formDisabled)
    }

    private func onAccountSelected(_ account: Account?) {
        guard didLoad else {
            return
        }

        TokenBroker.shared.selectedAccount = account

        guard let accountId = account?.id else {
            SecretStore.remove()
            return
        }

        SecretStore.set(secret: accountId)
    }

    private mutating func onAddAccount(accountType: AccountType) {
        formDisabled = true

        let mutableSelf = self
        TokenBroker.shared.acquireToken(
            scopes: config.scopes(for: accountType),
            userPrincipalName: nil,
            accountType: accountType,
            sender: hostingController.hostingController
        ) { result, _ in
            let allAccounts = TokenBroker.shared.allAccounts()
            mutableSelf.accounts = allAccounts
            mutableSelf.selectedAccount = allAccounts.find(
                userPrincipalName: result?.username ?? "",
                accountType: accountType
            )
            mutableSelf.formDisabled = false
        }
    }

    private func onRemoveAllAccounts() {
        formDisabled = true

        TokenBroker.shared.removeAllAccounts(sender: hostingController.hostingController)

        accounts = []
        selectedAccount = nil
        formDisabled = false
    }

    private func onSignOut() {
        formDisabled = true

        TokenBroker.shared.signOut(sender: hostingController.hostingController) { _, _ in
            accounts = TokenBroker.shared.allAccounts()
            selectedAccount = nil
            formDisabled = false
        }
    }
}

struct AccountsView_Previews: PreviewProvider {
    static var previews: some View {
        AccountsView(accounts: [
            Account(userPrincipalName: "arnold@contoso.com", accountType: .organizational),
            Account(userPrincipalName: "arnold@contoso.com", accountType: .microsoftAccount),
        ])
    }
}
