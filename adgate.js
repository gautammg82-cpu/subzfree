/**
 * SubzFree — Ad Gate System & Adsterra Direct Link Integration
 * Handles the download flow: show sponsor → open smartlink → unlock video export
 */

const ADGATE = (() => {

  // ── Adsterra Direct Link Config ──────────────────────────────
  // User's active Adsterra Direct Link (Mainstream Clean):
  let ADSTERRA_DIRECT_LINK = 'https://www.profitableratecpmnetwork.com/b2fgf5bt1?key=1093e49d0464db2e8c3742c5933234b0';
  const AD_DURATION = 3; // Fast 3-second auto-unlock!

  let overlay, countdown, progressFill, statusText, secSpan,
      btnUnlock, btnUnlockTimer, btnCancel, sponsorLink;
  let adblockWarningView, adSponsorView, btnRecheckAdblock, btnRecheckText,
      adblockStatusMsg, btnCancelAdblock;
  let timer   = null;
  let elapsed = 0;
  let onUnlockCallback = null;
  let sponsorClicked = false;

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

  // ── AdBlock Detection Engine ────────────────────────────────
  async function detectAdBlock() {
    // 1. DOM Bait Test (checks if CSS/extension blocks ad-like elements)
    let domBlocked = false;
    try {
      const bait = document.createElement('div');
      bait.className = 'adsbox ad-banner pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads';
      bait.style.cssText = 'width:1px!important;height:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;';
      bait.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bait);

      const style = window.getComputedStyle(bait);
      if (
        bait.offsetParent === null ||
        bait.offsetHeight === 0 ||
        bait.offsetWidth === 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      ) {
        domBlocked = true;
      }
      bait.remove();
    } catch (e) {
      domBlocked = true;
    }
    if (domBlocked) return true;

    // 2. Network Honeypot Probe (checks if network requests to ad hosts are blocked)
    try {
      await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      });
      return false; // Request reached network = no adblock!
    } catch (e) {
      // ERR_BLOCKED_BY_CLIENT / network filter active!
      return true;
    }
  }

  function init() {
    overlay            = document.getElementById('ad-modal-overlay');
    adblockWarningView = document.getElementById('adblock-warning-view');
    adSponsorView      = document.getElementById('ad-sponsor-view');
    btnRecheckAdblock  = document.getElementById('btn-recheck-adblock');
    btnRecheckText     = document.getElementById('btn-recheck-text');
    adblockStatusMsg   = document.getElementById('adblock-status-msg');
    btnCancelAdblock   = document.getElementById('btn-cancel-adblock');

    countdown     = document.getElementById('ad-countdown');
    progressFill  = document.getElementById('ad-progress-fill');
    statusText    = document.getElementById('ad-status-text');
    secSpan       = document.getElementById('ad-sec');
    btnUnlock     = document.getElementById('btn-unlock');
    btnUnlockTimer= document.getElementById('btn-unlock-timer');
    btnCancel     = document.getElementById('btn-cancel-ad');
    sponsorLink   = document.getElementById('sponsor-action-link');

    if (btnCancelAdblock) btnCancelAdblock.addEventListener('click', close);

    if (btnRecheckAdblock) {
      btnRecheckAdblock.addEventListener('click', async () => {
        if (btnRecheckText) btnRecheckText.textContent = '⏳ Checking...';
        btnRecheckAdblock.disabled = true;

        const isBlocked = await detectAdBlock();
        btnRecheckAdblock.disabled = false;
        if (btnRecheckText) btnRecheckText.textContent = '🔄 I have turned off AdBlock — Unlock Now';

        if (isBlocked) {
          if (adblockStatusMsg) {
            adblockStatusMsg.style.display = 'block';
            adblockStatusMsg.textContent = '⚠️ Ad blocker is still active! Please disable or whitelist SubzFree.';
          }
          if (adblockWarningView) {
            adblockWarningView.classList.add('shake');
            setTimeout(() => adblockWarningView.classList.remove('shake'), 500);
          }
        } else {
          if (adblockStatusMsg) adblockStatusMsg.style.display = 'none';
          showSponsorFlow();
        }
      });
    }

    if (sponsorLink) {
      sponsorLink.addEventListener('click', () => {
        sponsorClicked = true;
        clearInterval(timer);
        unlockDownload();
        if (statusText) {
          statusText.innerHTML = '🎉 Sponsor opened! Click the button below to start your video download!';
          statusText.style.color = '#10b981';
          statusText.style.fontWeight = '700';
        }
      });
    }

    if (btnCancel) btnCancel.addEventListener('click', close);
    if (btnUnlock) {
      btnUnlock.addEventListener('click', () => {
        if (!btnUnlock.disabled && onUnlockCallback) {
          if (!sponsorClicked) {
            triggerDirectLink();
          }
          close();
          onUnlockCallback();
        }
      });
    }

    // Close on overlay backdrop click
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) close();
      });
    }

    // Keyboard escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) close();
    });
  }

  /**
   * Open the ad gate modal and check AdBlock.
   * @param {Function} onUnlock - Called when countdown completes and user clicks download
   */
  async function open(onUnlock) {
    if (!overlay) init();
    onUnlockCallback = onUnlock;
    elapsed = 0;
    sponsorClicked = false;

    if (!overlay) return;
    overlay.classList.add('open');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Check AdBlocker first!
    const isBlocked = await detectAdBlock();
    if (isBlocked) {
      if (adSponsorView) adSponsorView.style.display = 'none';
      if (adblockWarningView) adblockWarningView.style.display = 'block';
      if (adblockStatusMsg) adblockStatusMsg.style.display = 'none';
      return; // Video export strictly blocked until AdBlock is turned off!
    }

    showSponsorFlow();
  }

  function showSponsorFlow() {
    if (adblockWarningView) adblockWarningView.style.display = 'none';
    if (adSponsorView) adSponsorView.style.display = 'block';

    // Reset state
    updateCountdown(AD_DURATION);
    if (btnUnlock) {
      btnUnlock.disabled = true;
      btnUnlock.style.background = '#0a0a0a';
      btnUnlock.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Preparing your video... (<span id="btn-unlock-timer">${AD_DURATION}s</span>)
      `;
      btnUnlockTimer = document.getElementById('btn-unlock-timer');
    }

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
    if (countdown) countdown.textContent = rem;
    if (secSpan) secSpan.textContent = rem;
    if (btnUnlockTimer) btnUnlockTimer.textContent = rem + 's';

    const pct = ((AD_DURATION - rem) / AD_DURATION) * 100;
    if (progressFill) progressFill.style.width = pct + '%';
  }

  function unlockDownload() {
    if (btnUnlock) {
      btnUnlock.disabled = false;
      btnUnlock.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      btnUnlock.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        ⚡ Download Video Free Now
      `;
    }
    if (statusText) {
      statusText.innerHTML = '🎉 Ready! Click above or below to start your download.';
      statusText.style.color = '#10b981';
      statusText.style.fontWeight = '700';
    }
  }

  function close() {
    clearInterval(timer);
    if (overlay) {
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }
    if (adblockWarningView) adblockWarningView.style.display = 'none';
    if (adSponsorView) adSponsorView.style.display = 'none';
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

  return { open, close, setDirectLink, getDirectLink, triggerDirectLink, detectAdBlock };
})();
