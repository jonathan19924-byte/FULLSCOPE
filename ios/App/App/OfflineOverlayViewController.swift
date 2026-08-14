import UIKit
import WebKit
import Capacitor

// The whole app is a WKWebView pointed at the live production URL (see
// capacitor.config.ts's comment on why — Server Actions, cookie auth, and
// cron routes all need a real server, so there's no offline/static bundle
// to fall back to). That means a network hiccup or a Vercel outage would
// otherwise leave the WebView blank or stuck on Safari's default error
// page — the single biggest thing that reads as "not a real app" to an App
// Store reviewer (and to a real user). This file adds a native fallback
// screen with a retry button for exactly that case.

/// Same reversible single-flip pattern as src/lib/locale.ts — flip this to
/// .en if NEXT_PUBLIC_LOCALE is ever switched back. Native code can't read
/// the web app's build-time env var, so this has to be kept in sync by hand.
private let offlineScreenLocale: OfflineScreenStrings.Locale = .he

struct OfflineScreenStrings {
    enum Locale: Equatable {
        case en
        case he
    }

    let title: String
    let message: String
    let retry: String

    static func current() -> OfflineScreenStrings {
        switch offlineScreenLocale {
        case .en:
            return OfflineScreenStrings(
                title: "You're offline",
                message: "FullScope couldn't connect. Check your internet connection and try again.",
                retry: "Try Again"
            )
        case .he:
            return OfflineScreenStrings(
                title: "אין חיבור לאינטרנט",
                message: "לא הצלחנו להתחבר ל-FullScope. בדקו את החיבור לאינטרנט ונסו שוב.",
                retry: "נסו שוב"
            )
        }
    }
}

/// Native, full-screen fallback shown when the WebView fails to load the
/// production URL — offline, DNS failure, server unreachable, etc. Built
/// with system colors (not the web app's Tailwind palette, which isn't
/// available to native code) so it automatically matches light/dark mode.
final class OfflineOverlayView: UIView {
    var onRetry: (() -> Void)?

    private let retryButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        setUp()
    }

    required init?(coder: NSCoder) {
        super.init(frame: .zero)
        setUp()
    }

    private func setUp() {
        backgroundColor = .systemBackground
        let strings = OfflineScreenStrings.current()
        let isRTL = offlineScreenLocale == .he

        let iconView = UIImageView(image: UIImage(systemName: "wifi.slash"))
        iconView.tintColor = .secondaryLabel
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconView.widthAnchor.constraint(equalToConstant: 44).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 44).isActive = true

        let titleLabel = UILabel()
        titleLabel.text = strings.title
        titleLabel.font = .systemFont(ofSize: 20, weight: .semibold)
        titleLabel.textColor = .label
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 0

        let messageLabel = UILabel()
        messageLabel.text = strings.message
        messageLabel.font = .systemFont(ofSize: 15, weight: .regular)
        messageLabel.textColor = .secondaryLabel
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0

        var buttonConfig = UIButton.Configuration.filled()
        buttonConfig.title = strings.retry
        buttonConfig.cornerStyle = .capsule
        buttonConfig.baseBackgroundColor = .label
        buttonConfig.baseForegroundColor = .systemBackground
        buttonConfig.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 28, bottom: 12, trailing: 28)
        retryButton.configuration = buttonConfig
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [iconView, titleLabel, messageLabel, retryButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.setCustomSpacing(20, after: messageLabel)
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.semanticContentAttribute = isRTL ? .forceRightToLeft : .forceLeftToRight

        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -32),
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
        ])
    }

    @objc private func retryTapped() {
        onRetry?()
    }
}

/// Proxies WKNavigationDelegate to Capacitor's own delegate (installed by
/// CAPBridgeViewController) so its cookie/auth/plugin-bridge handling keeps
/// running exactly as before — this only observes load success/failure to
/// toggle the offline overlay on top. Methods it doesn't implement itself
/// (decidePolicyFor, permission prompts, etc.) fall through to the original
/// via forwardingTarget(for:), the standard Obj-C proxy pattern.
final class NavigationFailureProxy: NSObject, WKNavigationDelegate {
    private weak var forwardTo: WKNavigationDelegate?
    var onFailure: (() -> Void)?
    var onSuccess: (() -> Void)?

    init(forwardingTo delegate: WKNavigationDelegate?) {
        self.forwardTo = delegate
        super.init()
    }

    override func responds(to aSelector: Selector!) -> Bool {
        if super.responds(to: aSelector) { return true }
        return forwardTo?.responds(to: aSelector) ?? false
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        if super.responds(to: aSelector) { return nil }
        return forwardTo
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        onSuccess?()
        forwardTo?.webView?(webView, didFinish: navigation)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        onFailure?()
        forwardTo?.webView?(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        onFailure?()
        forwardTo?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }
}

/// The app's root view controller (wired up in Main.storyboard in place of
/// the stock CAPBridgeViewController) — adds the offline overlay on top of
/// Capacitor's normal bridge behavior, which is otherwise unchanged.
class MainViewController: CAPBridgeViewController {
    private let offlineOverlay = OfflineOverlayView()
    private var navigationProxy: NavigationFailureProxy?

    override func viewDidLoad() {
        // Capacitor's own viewDidLoad() kicks off the initial page load
        // (see CAPBridgeViewController.loadWebView()) using its own
        // delegate. The proxy is swapped in immediately after, synchronously
        // — the WebView's network stack runs out-of-process, so there's no
        // realistic window for a failure callback to land before this runs.
        super.viewDidLoad()

        guard let webView = self.webView else { return }

        offlineOverlay.translatesAutoresizingMaskIntoConstraints = false
        offlineOverlay.isHidden = true
        offlineOverlay.onRetry = { [weak self] in self?.retryLoad() }
        view.addSubview(offlineOverlay)
        NSLayoutConstraint.activate([
            offlineOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            offlineOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            offlineOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            offlineOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        let proxy = NavigationFailureProxy(forwardingTo: webView.navigationDelegate)
        proxy.onFailure = { [weak self] in self?.showOfflineOverlay() }
        proxy.onSuccess = { [weak self] in self?.hideOfflineOverlay() }
        navigationProxy = proxy
        webView.navigationDelegate = proxy
    }

    private func showOfflineOverlay() {
        offlineOverlay.isHidden = false
        view.bringSubviewToFront(offlineOverlay)
    }

    private func hideOfflineOverlay() {
        offlineOverlay.isHidden = true
    }

    private func retryLoad() {
        guard let capBridge = bridge else { return }
        _ = webView?.load(URLRequest(url: capBridge.config.serverURL))
    }
}
