(function () {
  'use strict';
  try {
    localStorage.removeItem('tradeos_beta_session');
  } catch (_) {}

  try {
    sessionStorage.removeItem('tradeos_beta_session');
  } catch (_) {}
})();
