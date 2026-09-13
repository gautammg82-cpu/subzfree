/**
 * SubzFree — Ad Gate System
 * Handles the download flow: show ad → countdown → unlock download
 */

const ADGATE = (() => {

  const AD_DURATION = 30; // seconds

  let overlay, countdown, progressFill, statusText, secSpan,
      btnUnlock, btnUnlockTimer, btnCancel;
  let timer   = null;
  let elapsed = 0;
  let onUnlockCallback = null;

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
      Download Your Video — Free!
    `;
    if (statusText) {
      statusText.innerHTML = '✅ Ad complete! Click the button below to download your video.';
      statusText.style.color = 'var(--success)';
    }

    // Auto-trigger after 1s for best UX
    setTimeout(() => {
      if (onUnlockCallback && overlay.classList.contains('open')) {
        close();
        onUnlockCallback();
      }
    }, 1200);
  }

  function close() {
    clearInterval(timer);
    overlay.classList.remove('open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if (statusText) {
      statusText.style.color = '';
    }
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { open, close };
})();
