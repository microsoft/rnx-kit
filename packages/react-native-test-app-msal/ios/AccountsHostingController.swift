import Foundation
import React
import SwiftUI

final class ObservableHostingController: ObservableObject {
    @Published var id: Int = 0
    let hostingController: UIViewController

    init(_ hostingController: UIViewController) {
        self.hostingController = hostingController
    }
}

@objc(MicrosoftAccounts)
public final class AccountsHostingController: UIViewController {
    @objc
    init(bridge _: RCTBridge) {
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    dynamic required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override public func viewDidLoad() {
        super.viewDidLoad()

        let hostingController = UIHostingController(
            rootView: AccountsView().environmentObject(ObservableHostingController(self))
        )
        hostingController.view.autoresizingMask = view.autoresizingMask
        hostingController.view.frame = view.frame

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)
    }
}
