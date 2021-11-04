import Foundation

struct Config: Decodable {
    let clientId: String
    let msaScopes: [String]?
    let orgScopes: [String]?

    static func load() -> Config {
        guard let manifestURL = Bundle.main.url(forResource: "app", withExtension: "json"),
              let data = try? Data(contentsOf: manifestURL, options: .uncached)
        else {
            fatalError("Failed to load 'app.json'")
        }

        guard let manifest = try? JSONDecoder().decode(Manifest.self, from: data) else {
            fatalError("Failed to parse 'app.json'")
        }

        return manifest.msalConfig
    }

    public func scopes(for accountType: AccountType) -> [String] {
        switch accountType {
        case .microsoftAccount:
            return msaScopes ?? []
        case .organizational:
            return orgScopes ?? []
        }
    }
}

struct Manifest: Decodable {
    let msalConfig: Config

    enum CodingKeys: String, CodingKey {
        case msalConfig = "react-native-test-app-msal"
    }
}
