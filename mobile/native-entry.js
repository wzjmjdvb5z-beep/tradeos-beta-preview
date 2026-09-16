import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';

const InvoiceExport = registerPlugin('InvoiceExport');

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('tradeos-native');

  const style = document.createElement('style');
  style.textContent = `
    html.tradeos-native, html.tradeos-native body { overscroll-behavior-y: none; touch-action: manipulation; }
    html.tradeos-native .topbar {
      min-height: calc(66px + env(safe-area-inset-top)) !important;
      padding-top: calc(11px + env(safe-area-inset-top)) !important;
    }
    html.tradeos-native .app { padding-bottom: calc(94px + env(safe-area-inset-bottom)) !important; }
    html.tradeos-native .bottom-nav {
      bottom: 0 !important;
      width: 100% !important;
      height: calc(74px + env(safe-area-inset-bottom)) !important;
      padding-bottom: max(env(safe-area-inset-bottom), 10px) !important;
      border-radius: 24px 24px 0 0 !important;
    }
    html.tradeos-native .tos-br-fab { display: none !important; }
    html.tradeos-native input, html.tradeos-native textarea, html.tradeos-native select { font-size: 16px; }
    html.tradeos-native [data-tradeos-billing],
    html.tradeos-native .tos-billing-sheet { display: none !important; }
  `;
  document.head.appendChild(style);

  const accountPrivacyScript = document.createElement('script');
  accountPrivacyScript.src = './account-privacy-v1.js?v=1';
  accountPrivacyScript.defer = true;
  accountPrivacyScript.dataset.tradeosAccountPrivacyLoader = '1';
  document.head.appendChild(accountPrivacyScript);

  SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => {});

  const isExternalPurchase = (value) => {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return url.hostname === 'buy.stripe.com' || url.hostname.endsWith('.buy.stripe.com');
    } catch (_) {
      return /(^|\/\/)buy\.stripe\.com(?:\/|$)/i.test(String(value || ''));
    }
  };

  const suppressPurchaseLinks = () => {
    document.querySelectorAll('[data-tradeos-billing],a[href],button[data-href]').forEach((node) => {
      if (node.matches?.('[data-tradeos-billing]')) {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
        return;
      }
      const target = node.getAttribute?.('href') || node.getAttribute?.('data-href') || '';
      if (isExternalPurchase(target)) {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('tabindex', '-1');
      }
    });
  };

  suppressPurchaseLinks();
  const purchaseGuardObserver = new MutationObserver(suppressPurchaseLinks);
  purchaseGuardObserver.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[href],button[data-href]');
    const targetUrl = link?.getAttribute?.('href') || link?.getAttribute?.('data-href') || '';
    if (isExternalPurchase(targetUrl)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const target = event.target?.closest?.('button,[role="button"],.nav,.tos-com-clickable,.job-detail-list-card');
    if (!target || target.disabled) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }, true);

  App.addListener('resume', () => {
    suppressPurchaseLinks();
    window.dispatchEvent(new CustomEvent('tradeos:native-resume'));
  }).catch(() => {});

  const nativeShare = async ({ title = document.title, text = '', url = '' } = {}) => {
    await Share.share({ title, text, url, dialogTitle: title });
  };

  const openExternal = async (value) => {
    const url = new URL(String(value || ''));
    if (!/^https?:$/.test(url.protocol)) throw new Error('Only secure web links can be previewed.');
    await Browser.open({ url: url.href });
  };

  window.tradeOSNative = Object.freeze({
    isNative: true,
    platform: Capacitor.getPlatform(),
    share: nativeShare,
    exportInvoice: (options) => InvoiceExport.exportPDF(options),
    exportCSV: (options) => InvoiceExport.exportCSV(options),
    openExternal,
    haptic: () => Haptics.impact({ style: ImpactStyle.Medium })
  });

  if (!navigator.share) {
    try {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: nativeShare
      });
    } catch (_) {}
  }
}
