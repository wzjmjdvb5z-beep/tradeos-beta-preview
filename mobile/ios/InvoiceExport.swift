import UIKit
import Capacitor

// AppDelegate.swift is already a member of the generated App target.
class TradeOSViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(InvoiceExportPlugin())
    }
}

private final class InvoicePageRenderer: UIPrintPageRenderer {
    override var paperRect: CGRect { CGRect(x: 0, y: 0, width: 595.2, height: 841.8) }
    override var printableRect: CGRect { paperRect.insetBy(dx: 28, dy: 28) }
}

@objc(InvoiceExportPlugin)
public class InvoiceExportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InvoiceExportPlugin"
    public let jsName = "InvoiceExport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "exportPDF", returnType: CAPPluginReturnPromise)
    ]
    private var exporting = false

    @objc func exportPDF(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty, html.utf8.count <= 2_000_000 else {
            call.reject("The invoice could not be prepared for export.")
            return
        }
        let title = call.getString("title") ?? "Invoice"
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let presenter = self.bridge?.viewController else {
                call.reject("The invoice screen is unavailable. Please reopen it.")
                return
            }
            guard !self.exporting, presenter.presentedViewController == nil else {
                call.reject("Close the current share sheet before exporting again.")
                return
            }
            self.exporting = true
            let renderer = InvoicePageRenderer()
            renderer.addPrintFormatter(UIMarkupTextPrintFormatter(markupText: html), startingAtPageAt: 0)
            let pages = renderer.numberOfPages
            guard pages > 0, pages <= 100 else {
                self.exporting = false
                call.reject("This invoice could not be paginated for PDF export.")
                return
            }
            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, renderer.paperRect, [kCGPDFContextTitle as String: title])
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: pages))
            for page in 0..<pages {
                UIGraphicsBeginPDFPage()
                renderer.drawPage(at: page, in: UIGraphicsGetPDFContextBounds())
            }
            UIGraphicsEndPDFContext()
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("invoice-" + UUID().uuidString, isDirectory: true)
            let safeTitle = String(title.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) || $0 == "-" ? String($0) : "_" }.joined().prefix(80))
            let file = directory.appendingPathComponent((safeTitle.isEmpty ? "Invoice" : safeTitle) + ".pdf")
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                try data.write(to: file, options: .atomic)
                let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                if let popover = share.popoverPresentationController {
                    popover.sourceView = presenter.view
                    popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                    popover.permittedArrowDirections = []
                }
                share.completionWithItemsHandler = { [weak self] _, completed, _, error in
                    try? FileManager.default.removeItem(at: directory)
                    self?.exporting = false
                    if let error = error { call.reject(error.localizedDescription) }
                    else { call.resolve(["completed": completed]) }
                }
                presenter.present(share, animated: true)
            } catch {
                try? FileManager.default.removeItem(at: directory)
                self.exporting = false
                call.reject("The PDF could not be saved: " + error.localizedDescription)
            }
        }
    }
}
