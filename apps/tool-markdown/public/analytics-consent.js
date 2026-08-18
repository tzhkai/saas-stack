(function () {
  'use strict';

  var analyticsId = window.MM_ANALYTICS_ID;
  if (!analyticsId) return;

  var allowedEvents = {
    markdown_edit_started: true,
    markdown_editor_action: true,
    markdown_content_sanitized: true,
    markdown_editor_handoff: true,
    markdown_tool_action: true
  };
  var allowedParameters = { action: true, entry_point: true, source: true, tool: true, template: true };

  function hasCookie(name, value) {
    return document.cookie.split('; ').some(function (item) { return item === name + '=' + value; });
  }
  function analyticsAllowed() {
    return hasCookie('mm_analytics_choice', 'accepted') || hasCookie('mm_cookie_consent', '1');
  }
  function saveChoice(value) {
    document.cookie = 'mm_analytics_choice=' + value + ';max-age=31536000;path=/;SameSite=Lax';
  }
  function loadAnalytics() {
    if (document.querySelector('script[data-mm-analytics]')) return;
    window['ga-disable-' + analyticsId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', analyticsId, { anonymize_ip: true });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(analyticsId);
    script.dataset.mmAnalytics = 'true';
    document.head.appendChild(script);
  }
  function closeBanner() {
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
  }

  /* Intentionally narrow: callers cannot transmit document text or arbitrary properties. */
  window.mmTrack = function (eventName, params) {
    if (!allowedEvents[eventName] || !analyticsAllowed() || typeof window.gtag !== 'function') return;
    var safeParams = {};
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (key) {
        if (!allowedParameters[key]) return;
        var value = params[key];
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return;
        safeParams[key] = String(value).slice(0, 64);
      });
    }
    window.gtag('event', eventName, safeParams);
  };

  var legacyAccepted = hasCookie('mm_cookie_consent', '1');
  if (hasCookie('mm_analytics_choice', 'accepted') || legacyAccepted) {
    loadAnalytics();
    return;
  }
  if (hasCookie('mm_analytics_choice', 'declined')) {
    window['ga-disable-' + analyticsId] = true;
    return;
  }

  var banner = document.getElementById('cookie-banner');
  var accept = document.getElementById('cookie-accept');
  var decline = document.getElementById('cookie-decline');
  if (banner) banner.style.display = 'flex';
  if (accept) accept.onclick = function () { saveChoice('accepted'); loadAnalytics(); closeBanner(); };
  if (decline) decline.onclick = function () { saveChoice('declined'); window['ga-disable-' + analyticsId] = true; closeBanner(); };
})();
