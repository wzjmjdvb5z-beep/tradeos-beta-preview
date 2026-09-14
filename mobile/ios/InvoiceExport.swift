import UIKit
import Capacitor

// AppDelegate.swift is already a member of the generated App target.
class TradeOSViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(InvoiceExportPlugin())
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if ProcessInfo.processInfo.arguments.contains("--invoice-export-smoke") {
            checkExportBridge(attempt: 0)
        }
    }

    private func checkExportBridge(attempt: Int) {
        webView?.evaluateJavaScript("Boolean(window.Capacitor && window.Capacitor.isPluginAvailable('InvoiceExport'))") { [weak self] value, error in
            guard let self = self else { return }
            if (value as? Bool) == true {
                self.writeSmokeResult("registered")
            } else if attempt < 30 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.checkExportBridge(attempt: attempt + 1) }
            } else {
                self.writeSmokeResult("missing")
            }
        }
    }

    private func writeSmokeResult(_ result: String) {
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        try? result.write(to: directory.appendingPathComponent("invoice-export-smoke.txt"), atomically: true, encoding: .utf8)
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
        CAPPluginMethod(name: "exportPDF", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportCSV", returnType: CAPPluginReturnPromise)
    ]
    private var exporting = false

    @objc func exportCSV(_ call: CAPPluginCall) {
        guard let csv = call.getString("csv"), !csv.isEmpty, csv.utf8.count <= 5_000_000 else {
            call.reject("The CSV could not be prepared for export.")
            return
        }
        let title = call.getString("title") ?? "Veystead-payroll"
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let presenter = self.bridge?.viewController else {
                call.reject("The export screen is unavailable. Please reopen it.")
                return
            }
            guard !self.exporting, presenter.presentedViewController == nil else {
                call.reject("Close the current share sheet before exporting again.")
                return
            }
            self.exporting = true
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("csv-" + UUID().uuidString, isDirectory: true)
            let safeTitle = String(title.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) || $0 == "-" ? String($0) : "_" }.joined().prefix(80))
            let file = directory.appendingPathComponent((safeTitle.isEmpty ? "Veystead-payroll" : safeTitle) + ".csv")
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                try csv.write(to: file, atomically: true, encoding: .utf8)
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
                call.reject("The CSV could not be saved: " + error.localizedDescription)
            }
        }
    }

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
