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
  `;
  document.head.appendChild(style);

  SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => {});

  document.addEventListener('click', (event) => {
    const target = event.target?.closest?.('button,[role="button"],.nav,.tos-com-clickable,.job-detail-list-card');
    if (!target || target.disabled) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }, true);

  App.addListener('resume', () => {
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
