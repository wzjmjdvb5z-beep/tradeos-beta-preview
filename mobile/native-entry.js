import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('tradeos-native');

  const style = document.createElement('style');
  style.textContent = `
    html.tradeos-native, html.tradeos-native body { overscroll-behavior-y: none; }
    html.tradeos-native .bottom-nav { padding-bottom: max(env(safe-area-inset-bottom), 10px); }
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

  window.tradeOSNative = Object.freeze({
    isNative: true,
    platform: Capacitor.getPlatform(),
    share: nativeShare,
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
