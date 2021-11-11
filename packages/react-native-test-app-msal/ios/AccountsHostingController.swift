import Foundation
import SwiftUI

// "Forward-declare" RCTBridge to avoid dependency on React-Core
typealias RCTBridge = AnyObject

#if os(iOS)
    public typealias RTAViewController = UIViewController
    typealias RTAHostingController = UIHostingController
#else
    public typealias RTAViewController = NSViewController
    typealias RTAHostingController = NSHostingController
#endif

final class ObservableHostingController: ObservableObject {
    @Published var id: Int = 0

    let hostingController: RTAViewController

    init(_ hostingController: RTAViewController) {
        self.hostingController = hostingController
    }
}

@objc(MicrosoftAccounts)
public final class AccountsHostingController: RTAViewController {
    @objc
    init(bridge _: RCTBridge) {
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    dynamic required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    #if os(macOS)
        let contentView = NSStackView()

        override public func loadView() {
            contentView.orientation = .vertical
            contentView.edgeInsets = NSEdgeInsets(top: 24, left: 24, bottom: 24, right: 24)
            view = contentView
        }
    #endif

    override public func viewDidLoad() {
        super.viewDidLoad()

        let rootView = AccountsView().environmentObject(ObservableHostingController(self))
        let hostingController = RTAHostingController(rootView: rootView)

        addChild(hostingController)

        #if os(iOS)
            hostingController.view.autoresizingMask = view.autoresizingMask
            hostingController.view.frame = view.frame
            view.addSubview(hostingController.view)
            hostingController.didMove(toParent: self)
        #else
            contentView.addView(hostingController.view, in: .leading)
        #endif
    }
}
