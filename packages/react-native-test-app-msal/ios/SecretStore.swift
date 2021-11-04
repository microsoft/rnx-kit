import Foundation
import Security

struct SecretStore {
    static func get() -> String? {
        var result: AnyObject?
        SecItemCopyMatching(CFDictionary.query(for: nil, returnData: true), &result)
        guard let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    static func remove() {
        SecItemDelete(CFDictionary.query())
    }

    static func set(secret: String) {
        let data = secret.data(using: .utf8)
        let status = SecItemAdd(CFDictionary.query(for: data), nil)
        if status != 0 {
            if status == errSecDuplicateItem {
                let attributesToUpdate = [kSecValueData: data as Any] as CFDictionary
                SecItemUpdate(CFDictionary.query(), attributesToUpdate)
            } else {
                if let message = SecCopyErrorMessageString(status, nil) as String? {
                    NSLog("Failed to set secret: \(message)")
                } else {
                    NSLog("Failed to set secret (code \(status))")
                }
            }
        }
    }
}

extension CFDictionary {
    static func query(for secret: Data? = nil, returnData: Bool = false) -> CFDictionary {
        let service = "com.microsoft.ReactTestApp-MSAL"
        let account = "account"

        guard let secret = secret else {
            return [
                kSecAttrService: service,
                kSecAttrAccount: account,
                kSecClass: kSecClassGenericPassword,
                kSecReturnData: returnData,
            ] as CFDictionary
        }

        return [
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecClass: kSecClassGenericPassword,
            kSecValueData: secret as Any,
        ] as CFDictionary
    }
}
