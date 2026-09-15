/**
 * SubzFree — Ad Gate System & Adsterra Direct Link Integration
 * Handles the download flow: show sponsor → open smartlink → unlock video export
 */

const ADGATE = (() => {

  // ── Adsterra Direct Link Config ──────────────────────────────
  // User's active Adsterra Direct Link:
  let ADSTERRA_DIRECT_LINK = 'https://www.profitableratecpmnetwork.com/muhwpe78?key=3552137a3c47a6b8f44b00fa5bf53f56';
  const AD_DURATION = 5; // Fast 5-second countdown for high conversion & zero user drop-off!

  let overlay, countdown, progressFill, statusText, secSpan,
      btnUnlock, btnUnlockTimer, btnCancel;
  let timer   = null;
  let elapsed = 0;
  let onUnlockCallback = null;

  function setDirectLink(url) {
    if (url && typeof url === 'string') {
      ADSTERRA_DIRECT_LINK = url.trim();
    }
  }

  function getDirectLink() {
    return ADSTERRA_DIRECT_LINK;
  }

  function triggerDirectLink() {
    if (ADSTERRA_DIRECT_LINK && !ADSTERRA_DIRECT_LINK.includes('YOUR_DIRECT_LINK_HERE')) {
      try {
        window.open(ADSTERRA_DIRECT_LINK, '_blank');
      } catch (e) {
        console.warn('Pop-up blocked, falling back to window location:', e);
      }
    }
  }

  function init() {
    overlay       = document.getElementById('ad-modal-overlay');
    countdown     = document.getElementById('ad-countdown');
    progressFill  = document.getElementById('ad-progress-fill');
    statusText    = document.getElementById('ad-status-text');
    secSpan       = document.getElementById('ad-sec');
    btnUnlock     = document.getElementById('btn-unlock');
    btnUnlockTimer= document.getElementById('btn-unlock-timer');
    btnCancel     = document.getElementById('btn-cancel-ad');

    btnCancel.addEventListener('click', close);
    btnUnlock.addEventListener('click', () => {
      if (!btnUnlock.disabled && onUnlockCallback) {
        triggerDirectLink();
        close();
        onUnlockCallback();
      }
    });

    // Close on overlay backdrop click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    // Keyboard escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
  }

  /**
   * Open the ad gate modal and start countdown.
   * @param {Function} onUnlock - Called when countdown completes and user clicks download
   */
  function open(onUnlock) {
    if (!overlay) init();
    onUnlockCallback = onUnlock;
    elapsed = 0;

    overlay.classList.add('open');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Reset state
    updateCountdown(AD_DURATION);
    btnUnlock.disabled = true;
    btnUnlock.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Watching ad... (<span id="btn-unlock-timer">${AD_DURATION}s</span>)
    `;
    btnUnlockTimer = document.getElementById('btn-unlock-timer');

    // Start countdown interval
    clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  function tick() {
    elapsed++;
    const remaining = AD_DURATION - elapsed;
    updateCountdown(remaining);

    if (remaining <= 0) {
      clearInterval(timer);
      unlockDownload();
    }
  }

  function updateCountdown(remaining) {
    const rem = Math.max(0, remaining);
    countdown.textContent     = rem;
    if (secSpan) secSpan.textContent = rem;
    if (btnUnlockTimer) btnUnlockTimer.textContent = rem + 's';

    const pct = ((AD_DURATION - rem) / AD_DURATION) * 100;
    progressFill.style.width = pct + '%';
  }

  function unlockDownload() {
    btnUnlock.disabled = false;
    btnUnlock.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      ⚡ Download Video Free Now
    `;
    if (statusText) {
      statusText.innerHTML = '🎉 Sponsor verified! Click the button below to start your video download.';
      statusText.style.color = '#16a34a';
      statusText.style.fontWeight = '700';
    }
  }

  function close() {
    clearInterval(timer);
    overlay.classList.remove('open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if (statusText) {
      statusText.style.color = '';
      statusText.style.fontWeight = '';
    }
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { open, close, setDirectLink, getDirectLink, triggerDirectLink };
})();
