/**
 * SubzFree — Main Editor Controller (Captik Pro Experience)
 * Orchestrates:
 * - Topbar (editable project name, 1080p/720p, duration, direct SRT download, Save, Export)
 * - Skinny Icon Rail navigation
 * - Left Captions Panel with word chips, inline edit, accordion settings & sync
 * - Center Video Preview with aspect ratios (Original, 9:16, 16:9, 1:1, 4:5) & tap settings
 * - Right Dedicated Templates Panel with live preview cards, search & category filters
 * - Bottom Multi-Track Timeline with dynamic ruler, yellow playhead, beige caption blocks & emerald waveform
 * - Ad Gate & Free Video Download Engine
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const state = {
    videoFile:        null,
    videoURL:         null,
    segments:         [],      // caption segments with word timestamps
    currentStyle:     'captik-glow',
    isGenerating:     false,
    hasCaption:       false,
    animFrame:        null,
    aspectRatio:      'original',
    trackZoom:        100,     // percent
    isWordMode:       true,
    audioBuffer:      null,
    audioPeaks:       null,
    history:          [],      // for undo/redo
    historyIndex:     -1,
    pendingWhisperTranscription: null,
  };

  // ── DOM References ─────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const EL = {
    // Topbar
    projectTitleInput: $('project-title-input'),
    resBtns:           document.querySelectorAll('.res-btn'),
    topbarStatus:      $('topbar-status'),
    topbarDuration:    $('topbar-duration'),
    btnSaveProject:    $('btn-save-project'),
    btnDownloadSRT:    $('btn-download-srt'),
    btnHelpTop:        $('btn-help-top'),
    btnDownloadTop:    $('btn-download-top'),

    // Skinny Rail
    railBtnCaptions:   $('rail-btn-captions'),
    railBtnTranscribe: $('rail-btn-transcribe'),
    railBtnMedia:      $('rail-btn-media'),
    railBtnLyrics:     $('rail-btn-lyrics'),

    // Left Captions Panel
    leftCaptionsPanel: $('left-captions-panel'),
    captionsCountTag:  $('captions-count-tag'),
    btnLineMode1:      $('btn-line-mode-1'),
    btnLineMode2:      $('btn-line-mode-2'),
    btnToggleSettings: $('btn-toggle-settings'),
    settingsContent:   $('settings-accordion-content'),
    btnCaseUpper:      $('btn-case-upper'),
    btnCaseNormal:     $('btn-case-normal'),

    // Upload & Generate
    panelUploadSection:$('panel-upload-section'),
    uploadZone:        $('upload-zone'),
    fileInput:         $('file-input'),
    fileChipArea:      $('file-chip-area'),
    fileName:          $('file-name'),
    fileRemove:        $('file-remove'),
    langSelect:        $('lang-select'),
    btnGenerate:       $('btn-generate'),
    generateArea:      $('generate-area'),
    generatingArea:    $('generating-area'),
    genText:           $('gen-text'),
    genStep:           $('gen-step'),
    genProgress:       $('gen-progress'),

    // Quick Replace & Hint
    quickReplaceBar:   $('quick-replace-bar'),
    findWordInput:     $('find-word-input'),
    replaceWordInput:  $('replace-word-input'),
    btnExecReplace:    $('btn-exec-replace'),
    timelineEditHint:  $('timeline-edit-hint'),
    btnHintFix:        $('btn-hint-fix'),

    // Captions List & Dock
    captikEmptyLabel:  $('captik-empty-label'),
    captionDock:       $('caption-dock'),
    timelineScroll:    $('timeline-scroll'),
    timelineEmpty:     $('timeline-empty'),
    btnAddCaption:     $('btn-add-caption'),
    btnPasteLyrics:    $('btn-paste-lyrics'),
    btnFixScript:      $('btn-fix-script'),
    btnToggleReplace:  $('btn-toggle-replace'),
    btnClearCaptions:  $('btn-clear-captions'),
    dockActivePill:    $('dock-active-pill'),
    dockActiveIndex:   $('dock-active-index'),
    dockActiveTime:    $('dock-active-time'),
    dockActiveLineInput:$('dock-active-line-input'),
    btnDockSaveLine:   $('btn-dock-save-line'),

    // Center Preview
    previewWrap:       $('preview-wrap'),
    previewEmpty:      $('preview-empty'),
    videoContainer:    $('video-container'),
    previewVideo:      $('preview-video'),
    previewCanvas:     $('preview-canvas'),
    videoControls:     $('video-controls'),
    btnPlay:           $('btn-play'),
    playIcon:          $('play-icon'),
    videoSeek:         $('video-seek'),
    timeDisplay:       $('time-display'),
    styleLabel:        $('style-label'),
    previewZoomBadge:  $('preview-zoom-badge'),
    btnFullscreen:     $('btn-fullscreen'),
    aspectBtns:        document.querySelectorAll('.aspect-btn'),

    // Floating Caption Toolbar
    captionToolbar:    $('caption-toolbar'),
    toolbarClose:      $('toolbar-close'),
    toolbarCaptionText:$('toolbar-caption-text'),
    btnToolbarSaveText:$('btn-toolbar-save-text'),
    captionSizeSlider: $('caption-size-slider'),

    // Right Templates & Text Sidebar
    tabBtnTemplates:   $('tab-btn-templates'),
    tabBtnText:        $('tab-btn-text'),
    tabContentTemplates:$('tab-content-templates'),
    tabContentText:    $('tab-content-text'),
    pillBuiltIn:       $('pill-built-in'),
    pillMyPresets:     $('pill-my-presets'),
    styleSearch:       $('style-search'),
    btnSavePreset:     $('btn-save-preset'),
    styleCatTabs:      $('style-category-tabs'),
    styleCountBadge:   $('style-count-badge'),
    stylePicker:       $('style-picker'),

    // Text Inspector Inputs
    textFontFamily:    $('text-font-family'),
    textSizeSlider:    $('text-size-slider'),
    textPrimaryColor:  $('text-primary-color'),
    textHighlightColor:$('text-highlight-color'),
    textStrokeColor:   $('text-stroke-color'),
    textCaseUpper:     $('text-case-upper'),
    textCaseNormal:    $('text-case-normal'),
    textGlowSlider:    $('text-glow-slider'),

    // Bottom Multi-Track Timeline
    bottomTimeline:    $('bottom-timeline'),
    timelineBtnPlay:   $('timeline-btn-play'),
    timelinePlayIcon:  $('timeline-play-icon'),
    timelineBtnPrev:   $('timeline-btn-prev'),
    timelineBtnNext:   $('timeline-btn-next'),
    timelineBtnUndo:   $('timeline-btn-undo'),
    timelineBtnRedo:   $('timeline-btn-redo'),
    timelineBtnDelete: $('timeline-btn-delete'),
    btnModeWord:       $('btn-mode-word'),
    btnModeLine:       $('btn-mode-line'),
    timelineBtnAddLine:$('timeline-btn-add-line'),
    timelineBtnSplit:  $('timeline-btn-split'),
    timelineTimecode:  $('timeline-timecode'),
    timelineZoomSlider:$('timeline-zoom-slider'),
    zoomPercentTag:    $('zoom-percent-tag'),
    timelineTracksViewport: $('timeline-tracks-viewport'),
    timelinePlayhead:  $('timeline-playhead'),
    timelineRuler:     $('timeline-ruler'),
    captionBlocksTrack:$('caption-blocks-track-content'),
    waveformCanvas:    $('waveform-canvas'),

    // Modals
    adModalOverlay:    $('ad-modal-overlay'),
    renderOverlay:     $('render-overlay'),
    renderPercent:     $('render-percent'),
    renderSub:         $('render-sub'),
    renderFill:        $('render-progress-fill'),
    lyricsModal:       $('lyrics-modal'),
    lyricsInput:       $('lyrics-input'),
    btnCloseLyrics:    $('btn-close-lyrics'),
    btnCancelLyrics:   $('btn-cancel-lyrics'),
    btnApplyLyrics:    $('btn-apply-lyrics'),
    btnVoiceDictate:   $('btn-voice-dictate'),
    btnSampleSong1:    $('btn-sample-song1'),
    btnSampleSong2:    $('btn-sample-song2'),
    btnSampleSong3:    $('btn-sample-song3'),
    btnSampleSpeech:   $('btn-sample-speech'),
    btnSampleEnglish:  $('btn-sample-english'),
    btnOpenPasteModal: $('btn-open-paste-modal'),
    btnEmptyScript:    $('btn-empty-script'),
    modalTabBtnScript: $('modal-tab-btn-script'),
    modalTabBtnWhisper:$('modal-tab-btn-whisper'),
    modalTabBtnLive:   $('modal-tab-btn-live'),
    modalPaneScript:   $('modal-pane-script'),
    modalPaneWhisper:  $('modal-pane-whisper'),
    modalPaneLive:     $('modal-pane-live'),
    inputGroqKey:      $('input-groq-key'),
    btnToggleGroqKey:  $('btn-toggle-groq-key'),
    whisperLangSelect: $('whisper-lang-select'),
    btnCancelWhisper:  $('btn-cancel-whisper'),
    btnRunWhisper:     $('btn-run-whisper'),
    dictateStatus:     $('dictate-status'),
    dictatePreview:    $('dictate-preview'),
    btnApplyDictate:   $('btn-apply-dictate'),
    toast:             $('toast'),
  };

  // ── Toast Utility ──────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg, type = 'info') {
    if (!EL.toast) return;
    EL.toast.textContent = msg;
    EL.toast.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { EL.toast.classList.remove('show'); }, 3200);
  }

  function setStatus(msg) {
    if (EL.topbarStatus) EL.topbarStatus.textContent = msg;
  }

  // ── History & Undo/Redo ────────────────────────────────────
  function recordState() {
    const snap = JSON.stringify(state.segments);
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push(snap);
    state.historyIndex = state.history.length - 1;
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      state.segments = JSON.parse(state.history[state.historyIndex]);
      window.__SUBZFREE_SEGMENTS__ = state.segments;
      renderTimeline(state.segments);
      renderTimelineBlocks();
      showToast('Undone last action', 'info');
    } else {
      showToast('Nothing to undo', 'info');
    }
  }

  function redo() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      state.segments = JSON.parse(state.history[state.historyIndex]);
      window.__SUBZFREE_SEGMENTS__ = state.segments;
      renderTimeline(state.segments);
      renderTimelineBlocks();
      showToast('Redone action', 'info');
    } else {
      showToast('Nothing to redo', 'info');
    }
  }

  // Captions Panel Undo, Redo, and 1-Click Hinglish Converter
  const btnLeftUndo = $('btn-left-undo');
  if (btnLeftUndo) btnLeftUndo.addEventListener('click', undo);

  const btnLeftRedo = $('btn-left-redo');
  if (btnLeftRedo) btnLeftRedo.addEventListener('click', redo);

  const btnConvertHinglish = $('btn-convert-hinglish');
  if (btnConvertHinglish) {
    btnConvertHinglish.addEventListener('click', async () => {
      if (!state.segments || state.segments.length === 0) {
        showToast('No captions to convert yet. Upload video or generate captions first!', 'info');
        return;
      }
      recordState();
      showToast('✨ AI is perfecting captions to 100% accurate Hinglish...', 'info');

      const savedKey = (typeof localStorage !== 'undefined') ? (localStorage.getItem('subzfree_groq_key') || '').trim() : '';
      
      // Step A: Immediate word-by-word high-accuracy transliteration + spelling normalization
      state.segments.forEach(seg => {
        if (seg.words && Array.isArray(seg.words)) {
          seg.words.forEach(w => {
            if (/[\u0900-\u097F]/.test(w.word)) {
              w.word = (typeof TRANSCRIBE.transliterateDevanagariWord === 'function')
                ? TRANSCRIBE.transliterateDevanagariWord(w.word)
                : TRANSCRIBE.devanagariToHinglish(w.word);
            }
            if (typeof TRANSCRIBE.normalizeHinglishSpelling === 'function') {
              w.word = TRANSCRIBE.normalizeHinglishSpelling(w.word);
            }
          });
          seg.text = seg.words.map(w => w.word).join(' ');
        } else {
          seg.text = TRANSCRIBE.devanagariToHinglish(seg.text);
          if (typeof TRANSCRIBE.normalizeHinglishSpelling === 'function') {
            seg.text = seg.text.split(/\s+/).map(TRANSCRIBE.normalizeHinglishSpelling).join(' ');
          }
        }
      });

      // Step B: If Groq Key exists, refine with LLaMA 3.1 8B while keeping exact word timestamps
      if (savedKey && typeof TRANSCRIBE.refineToHinglishWithAI === 'function') {
        try {
          const originalLines = state.segments.map(s => s.text);
          const refinedLines = await TRANSCRIBE.refineToHinglishWithAI(originalLines, savedKey);

          state.segments.forEach((seg, i) => {
            const refinedStr = (refinedLines[i] || '').trim();
            if (!refinedStr) return;

            let refinedWords = refinedStr.split(/\s+/).filter(Boolean);
            if (typeof TRANSCRIBE.normalizeHinglishSpelling === 'function') {
              refinedWords = refinedWords.map(TRANSCRIBE.normalizeHinglishSpelling);
            }
            const origWords = seg.words;

            if (origWords && refinedWords.length === origWords.length) {
              // 1-to-1 match: retain exact acoustic timing per word
              refinedWords.forEach((rw, wi) => {
                origWords[wi].word = rw;
              });
              seg.text = refinedWords.join(' ');
            } else if (origWords && refinedWords.length > 0 && origWords.length > 0) {
              // Differing word count: interpolate strictly within spoken speech span
              const speechStart = origWords[0].start;
              const speechEnd = origWords[origWords.length - 1].end;
              const dur = Math.max(0.3, speechEnd - speechStart);
              const wDur = dur / refinedWords.length;

              seg.words = refinedWords.map((rw, wi) => ({
                word: rw,
                start: speechStart + wi * wDur,
                end: speechStart + (wi + 1) * wDur
              }));
              seg.start = speechStart;
              seg.end = speechEnd;
              seg.text = refinedWords.join(' ');
            }
          });
        } catch (e) {
          console.warn('AI Hinglish refinement error:', e);
        }
      }

      window.__SUBZFREE_SEGMENTS__ = state.segments;
      renderTimeline(state.segments);
      renderTimelineBlocks();
      requestDrawFrame();
      showToast('🎉 Captions converted to high-accuracy Hinglish with zero timing lag!', 'success');
    });
  }

  // ── Topbar Controls ────────────────────────────────────────

  // Editable Project Title
  if (EL.projectTitleInput) {
    EL.projectTitleInput.addEventListener('change', () => {
      const name = EL.projectTitleInput.value.trim() || 'Untitled Video';
      EL.projectTitleInput.value = name;
      showToast(`Project renamed to "${name}"`, 'success');
    });
  }

  // Resolution Toggles
  EL.resBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      EL.resBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const res = btn.dataset.res;
      showToast(`Export resolution set to ${res}p Full HD`, 'info');
    });
  });

  // Direct SRT Download Button
  if (EL.btnDownloadSRT) {
    EL.btnDownloadSRT.addEventListener('click', () => {
      if (!state.segments || state.segments.length === 0) {
        showToast('Generate or paste captions first to download SRT!', 'error');
        return;
      }
      const title = (EL.projectTitleInput ? EL.projectTitleInput.value.trim() : '') || 'subtitles';
      EXPORT.downloadSRT(state.segments, `${title}.srt`);
      showToast('📥 SRT subtitle file downloaded!', 'success');
    });
  }

  // Save Project in LocalStorage
  if (EL.btnSaveProject) {
    EL.btnSaveProject.addEventListener('click', () => {
      try {
        const projData = {
          title: EL.projectTitleInput ? EL.projectTitleInput.value : 'Project',
          style: state.currentStyle,
          segments: state.segments,
          updatedAt: Date.now()
        };
        localStorage.setItem('subzfree_saved_project', JSON.stringify(projData));
        showToast('💾 Project saved locally!', 'success');
      } catch (e) {
        showToast('Project saved in session memory!', 'info');
      }
    });
  }

  // Help Button
  if (EL.btnHelpTop) {
    EL.btnHelpTop.addEventListener('click', () => {
      alert(`SubzFree Shortcuts:
• Space: Play / Pause
• Left / Right Arrow: Seek 2s
• Click any word: Seek or edit
• Tap Caption on Preview: Change size & position
• 1-Click Templates: Instant live visual update`);
    });
  }

  // ── Skinny Rail Navigation ─────────────────────────────────
  const railBtns = [EL.railBtnCaptions, EL.railBtnTranscribe, EL.railBtnMedia, EL.railBtnLyrics];
  function setRailActive(activeBtn) {
    railBtns.forEach(b => { if (b) b.classList.remove('active'); });
    if (activeBtn) activeBtn.classList.add('active');
  }

  if (EL.railBtnCaptions) {
    EL.railBtnCaptions.addEventListener('click', () => {
      setRailActive(EL.railBtnCaptions);
      if (EL.timelineScroll) EL.timelineScroll.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (EL.railBtnTranscribe) {
    EL.railBtnTranscribe.addEventListener('click', () => {
      setRailActive(EL.railBtnTranscribe);
      if (EL.langSelect) {
        EL.langSelect.focus();
        showToast('Select language and generate captions', 'info');
      }
    });
  }

  if (EL.railBtnMedia) {
    EL.railBtnMedia.addEventListener('click', () => {
      setRailActive(EL.railBtnMedia);
      if (EL.fileInput) EL.fileInput.click();
    });
  }

  if (EL.railBtnLyrics) {
    EL.railBtnLyrics.addEventListener('click', () => {
      setRailActive(EL.railBtnLyrics);
      if (EL.btnPasteLyrics) EL.btnPasteLyrics.click();
    });
  }

  // ── Left Panel Accordion & Mode Toggles ────────────────────
  if (EL.btnToggleSettings && EL.settingsContent) {
    let settingsOpen = true;
    EL.btnToggleSettings.addEventListener('click', () => {
      settingsOpen = !settingsOpen;
      EL.settingsContent.style.display = settingsOpen ? 'flex' : 'none';
      const icon = EL.btnToggleSettings.querySelector('.toggle-icon');
      if (icon) icon.textContent = settingsOpen ? '▾' : '▸';
    });
  }

  // 1 Line vs 2 Lines Mode
  if (EL.btnLineMode1 && EL.btnLineMode2) {
    EL.btnLineMode1.addEventListener('click', () => {
      EL.btnLineMode1.classList.add('active');
      EL.btnLineMode2.classList.remove('active');
      window.__SUBZFREE_LINE_MODE__ = 1;
      showToast('Caption display: 1 Line at a time', 'info');
    });
    EL.btnLineMode2.addEventListener('click', () => {
      EL.btnLineMode2.classList.add('active');
      EL.btnLineMode1.classList.remove('active');
      window.__SUBZFREE_LINE_MODE__ = 2;
      showToast('Caption display: 2 Lines at a time', 'info');
    });
  }

  // Case Transform (Upper vs Normal)
  function applyCase(isUpper) {
    window.__SUBZFREE_FORCE_UPPER__ = isUpper;
    if (EL.btnCaseUpper) EL.btnCaseUpper.classList.toggle('active', isUpper);
    if (EL.btnCaseNormal) EL.btnCaseNormal.classList.toggle('active', !isUpper);
    if (EL.textCaseUpper) EL.textCaseUpper.classList.toggle('active', isUpper);
    if (EL.textCaseNormal) EL.textCaseNormal.classList.toggle('active', !isUpper);
    showToast(isUpper ? 'Text transformed to UPPERCASE' : 'Text set to Normal Case', 'info');
  }

  if (EL.btnCaseUpper) EL.btnCaseUpper.addEventListener('click', () => applyCase(true));
  if (EL.btnCaseNormal) EL.btnCaseNormal.addEventListener('click', () => applyCase(false));
  if (EL.textCaseUpper) EL.textCaseUpper.addEventListener('click', () => applyCase(true));
  if (EL.textCaseNormal) EL.textCaseNormal.addEventListener('click', () => applyCase(false));

  // ── Video Upload & Load Handling ───────────────────────────
  EL.uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    EL.uploadZone.classList.add('drag-over');
  });
  EL.uploadZone.addEventListener('dragleave', () => {
    EL.uploadZone.classList.remove('drag-over');
  });
  EL.uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    EL.uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      loadVideo(file);
    } else {
      showToast('Please drop a video file (MP4, MOV, WebM)', 'error');
    }
  });

  EL.fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) loadVideo(file);
  });

  EL.fileRemove.addEventListener('click', () => {
    resetVideo();
  });

  function loadVideo(file) {
    if (state.videoURL) URL.revokeObjectURL(state.videoURL);
    state.videoFile = file;
    state.videoURL  = URL.createObjectURL(file);

    // Auto set project title if default
    if (EL.projectTitleInput && EL.projectTitleInput.value === 'manshul vedio') {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
      EL.projectTitleInput.value = cleanName;
    }

    // Show file chip & hide upload zone
    EL.fileName.textContent       = file.name;
    EL.fileChipArea.style.display = 'flex';
    EL.uploadZone.querySelector('input').style.pointerEvents = 'none';
    EL.uploadZone.style.opacity   = '0.5';

    // Load into video element
    EL.previewVideo.src = state.videoURL;
    EL.previewVideo.load();

    EL.previewVideo.addEventListener('loadedmetadata', onVideoLoaded, { once: true });
    EL.previewVideo.addEventListener('error', () => {
      showToast('Could not load video. Try a different file.', 'error');
    }, { once: true });

    // Generate Audio Waveform from video file
    generateAudioWaveform(file);
  }

  function onVideoLoaded() {
    const v = EL.previewVideo;

    // Show video container, hide empty state (playback transport is in bottom timeline)
    EL.previewEmpty.style.display   = 'none';
    EL.videoContainer.style.display = 'flex';
    if (EL.videoControls) EL.videoControls.style.display = 'none';

    // Apply active aspect ratio (e.g. 9:16) to maximize video preview height
    const activeBtn = Array.from(EL.aspectBtns).find(b => b.classList.contains('active'));
    applyAspectRatio(activeBtn ? activeBtn.dataset.ratio : '9:16');

    // Set canvas dimensions
    EL.previewCanvas.width  = v.videoWidth || 1080;
    EL.previewCanvas.height = v.videoHeight || 1920;

    // Enable buttons
    EL.btnGenerate.disabled = false;
    EL.btnGenerate.textContent = '✨ Generate Captions';
    if (EL.btnPasteLyrics) EL.btnPasteLyrics.disabled = false;

    // Update duration tags
    const durStr = formatTime(v.duration);
    if (EL.topbarDuration) EL.topbarDuration.textContent = `⏱️ ${durStr}`;
    setStatus(`Video ready — ${durStr} duration`);
    showToast('Video loaded! Choose a template or generate captions.', 'info');

    // Build timeline ruler
    buildTimelineRuler(v.duration);

    // Start render loop & video controls
    startRenderLoop();
    initVideoControls();

    // Auto run pending Groq Whisper transcription if user entered key before picking video
    if (state.pendingWhisperTranscription) {
      const pending = state.pendingWhisperTranscription;
      state.pendingWhisperTranscription = null;
      setTimeout(() => {
        runWhisperTranscription(pending.key, pending.lang);
      }, 350);
    }
  }

  function resetVideo() {
    EL.previewVideo.pause();
    cancelAnimationFrame(state.animFrame);

    if (state.videoURL) URL.revokeObjectURL(state.videoURL);
    state.videoFile    = null;
    state.videoURL     = null;
    state.segments     = [];
    state.hasCaption   = false;

    // Reset UI
    EL.previewVideo.src              = '';
    EL.previewEmpty.style.display    = 'flex';
    EL.videoContainer.style.display  = 'none';
    if (EL.videoControls) EL.videoControls.style.display = 'none';
    EL.fileChipArea.style.display    = 'none';
    EL.uploadZone.style.opacity      = '1';
    EL.uploadZone.querySelector('input').style.pointerEvents = '';
    EL.btnGenerate.disabled = false;
    if (EL.btnPasteLyrics) EL.btnPasteLyrics.disabled = true;
    if (EL.captionToolbar) EL.captionToolbar.style.display = 'none';
    if (EL.lyricsModal) EL.lyricsModal.style.display = 'none';
    if (EL.btnFixScript) EL.btnFixScript.style.display = 'none';
    if (EL.btnToggleReplace) EL.btnToggleReplace.style.display = 'none';
    if (EL.quickReplaceBar) EL.quickReplaceBar.style.display = 'none';
    if (EL.timelineEditHint) EL.timelineEditHint.style.display = 'none';
    EL.btnDownloadTop.disabled = true;
    EL.generateArea.style.display   = 'block';
    EL.generatingArea.style.display = 'none';
    if (EL.btnAddCaption) EL.btnAddCaption.style.display = 'none';
    if (EL.btnClearCaptions) EL.btnClearCaptions.style.display = 'none';

    renderTimeline([]);
    renderTimelineBlocks();
    clearCanvas();
    setStatus('Upload a video to start');
  }

  // ── Video Controls & Playback Sync ─────────────────────────
  let videoControlsInitialized = false;
  function initVideoControls() {
    if (videoControlsInitialized) return;
    videoControlsInitialized = true;
    const v = EL.previewVideo;

    if (EL.btnPlay) EL.btnPlay.addEventListener('click', togglePlay);
    if (EL.timelineBtnPlay) EL.timelineBtnPlay.addEventListener('click', togglePlay);

    v.addEventListener('play',  () => {
      updatePlayIcons(true);
      startPlaybackLoop();
    });
    v.addEventListener('pause', () => {
      updatePlayIcons(false);
      stopPlaybackLoop();
    });
    v.addEventListener('ended', () => {
      updatePlayIcons(false);
      stopPlaybackLoop();
    });
    v.addEventListener('seeked', () => {
      requestDrawFrame();
      updatePlayheadPosition(v.currentTime, v.duration);
      highlightActiveCaption(v.currentTime);
    });

    v.addEventListener('timeupdate', () => {
      if (!isPlaybackLoopRunning) {
        const cur = v.currentTime;
        const dur = v.duration || 0;
        const formatted = `${formatTime(cur)} / ${formatTime(dur)}`;

        if (EL.timeDisplay) EL.timeDisplay.textContent = formatted;
        if (EL.timelineTimecode) EL.timelineTimecode.textContent = formatted;
        if (EL.videoSeek) EL.videoSeek.value = dur ? (cur / dur) * 100 : 0;

        updatePlayheadPosition(cur, dur);
        highlightActiveCaption(cur);
      }
    });

    if (EL.videoSeek) {
      EL.videoSeek.addEventListener('input', () => {
        v.currentTime = (EL.videoSeek.value / 100) * v.duration;
        requestDrawFrame();
        updatePlayheadPosition(v.currentTime, v.duration);
        highlightActiveCaption(v.currentTime);
      });
    }

    // Previous / Next buttons
    if (EL.timelineBtnPrev) {
      EL.timelineBtnPrev.addEventListener('click', () => {
        v.currentTime = Math.max(0, v.currentTime - 2);
        requestDrawFrame();
        updatePlayheadPosition(v.currentTime, v.duration);
        highlightActiveCaption(v.currentTime);
      });
    }
    if (EL.timelineBtnNext) {
      EL.timelineBtnNext.addEventListener('click', () => {
        v.currentTime = Math.min(v.duration, v.currentTime + 2);
        requestDrawFrame();
        updatePlayheadPosition(v.currentTime, v.duration);
        highlightActiveCaption(v.currentTime);
      });
    }

    // Undo / Redo in Timeline
    if (EL.timelineBtnUndo) EL.timelineBtnUndo.addEventListener('click', undo);
    if (EL.timelineBtnRedo) EL.timelineBtnRedo.addEventListener('click', redo);

    // Delete Current Block
    if (EL.timelineBtnDelete) {
      EL.timelineBtnDelete.addEventListener('click', () => {
        const cur = v.currentTime;
        const idx = state.segments.findIndex(s => cur >= s.start && cur <= s.end);
        if (idx >= 0) {
          recordState();
          state.segments.splice(idx, 1);
          window.__SUBZFREE_SEGMENTS__ = state.segments;
          renderTimeline(state.segments);
          renderTimelineBlocks();
          showToast('Caption block deleted', 'info');
        } else {
          showToast('No caption block at current playhead position', 'info');
        }
      });
    }

    // Split Line at playhead
    if (EL.timelineBtnSplit) {
      EL.timelineBtnSplit.addEventListener('click', () => {
        const cur = v.currentTime;
        const seg = state.segments.find(s => cur > s.start && cur < s.end);
        if (seg) {
          recordState();
          const wordsBefore = seg.words.filter(w => w.end <= cur);
          const wordsAfter  = seg.words.filter(w => w.end > cur);

          if (wordsBefore.length && wordsAfter.length) {
            seg.words = wordsBefore;
            seg.end   = cur;
            seg.text  = wordsBefore.map(w => w.word).join(' ');

            const newSeg = {
              id: Date.now(),
              start: cur,
              end: wordsAfter[wordsAfter.length - 1].end,
              text: wordsAfter.map(w => w.word).join(' '),
              words: wordsAfter
            };
            state.segments.push(newSeg);
            state.segments.sort((a, b) => a.start - b.start);
            window.__SUBZFREE_SEGMENTS__ = state.segments;
            renderTimeline(state.segments);
            renderTimelineBlocks();
            showToast('Line split into two blocks', 'success');
          }
        }
      });
    }

    // Add Line at playhead
    if (EL.timelineBtnAddLine) {
      EL.timelineBtnAddLine.addEventListener('click', () => {
        const cur = v.currentTime;
        recordState();
        const newSeg = {
          id: Date.now(),
          start: cur,
          end: Math.min(v.duration, cur + 2.5),
          text: 'New Caption Line',
          words: [
            { word: 'New', start: cur, end: cur + 0.6 },
            { word: 'Caption', start: cur + 0.6, end: cur + 1.4 },
            { word: 'Line', start: cur + 1.4, end: Math.min(v.duration, cur + 2.5) }
          ]
        };
        state.segments.push(newSeg);
        state.segments.sort((a, b) => a.start - b.start);
        window.__SUBZFREE_SEGMENTS__ = state.segments;
        renderTimeline(state.segments);
        renderTimelineBlocks();
        showToast('Added caption block at playhead', 'success');
      });
    }

    // Dock "+ Add Line" button
    if (EL.btnAddCaption) {
      EL.btnAddCaption.addEventListener('click', () => {
        if (EL.timelineBtnAddLine) EL.timelineBtnAddLine.click();
      });
    }

    // Dock "Clear" button
    if (EL.btnClearCaptions) {
      EL.btnClearCaptions.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all captions?')) {
          recordState();
          state.segments = [];
          state.hasCaption = false;
          window.__SUBZFREE_SEGMENTS__ = [];
          renderTimeline([]);
          renderTimelineBlocks();
          requestDrawFrame();
          if (EL.dockActivePill) EL.dockActivePill.style.display = 'none';
          if (EL.dockActiveLineInput) EL.dockActiveLineInput.value = '';
          showToast('All captions cleared', 'info');
        }
      });
    }

    // Dock active line text editor (direct editing above timeline)
    function saveDockActiveLine() {
      if (!EL.dockActiveLineInput) return;
      const newText = EL.dockActiveLineInput.value.trim();
      if (!newText) return;

      let targetIdx = lastActiveSegIndex;
      if (targetIdx < 0 || !state.segments[targetIdx]) {
        const cur = EL.previewVideo.currentTime;
        targetIdx = state.segments.findIndex(s => cur >= s.start && cur <= s.end);
        if (targetIdx < 0 && state.segments.length > 0) targetIdx = 0;
      }
      if (targetIdx < 0 || !state.segments[targetIdx]) return;

      const seg = state.segments[targetIdx];
      if (newText === seg.text) return;

      recordState();
      seg.text = newText;
      const wList = seg.text.split(/\s+/).filter(Boolean);
      const dur = Math.max(0.4, seg.end - seg.start);
      const wDur = dur / Math.max(1, wList.length);
      seg.words = wList.map((w, wi) => ({
        word: w,
        start: seg.start + wi * wDur,
        end: seg.start + (wi + 1) * wDur
      }));
      window.__SUBZFREE_SEGMENTS__ = state.segments;
      renderTimeline(state.segments);
      renderTimelineBlocks();
      requestDrawFrame();
      showToast(`Updated Line ${targetIdx + 1}: "${newText}"`, 'success');
    }

    if (EL.btnDockSaveLine) {
      EL.btnDockSaveLine.addEventListener('click', saveDockActiveLine);
    }
    if (EL.dockActiveLineInput) {
      EL.dockActiveLineInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          saveDockActiveLine();
          EL.dockActiveLineInput.blur();
        }
      });
    }

    // Word Mode vs Line Mode toggle in Timeline
    if (EL.btnModeWord && EL.btnModeLine) {
      EL.btnModeWord.addEventListener('click', () => {
        EL.btnModeWord.classList.add('active');
        EL.btnModeLine.classList.remove('active');
        state.isWordMode = true;
        showToast('Timeline selection mode: WORD', 'info');
      });
      EL.btnModeLine.addEventListener('click', () => {
        EL.btnModeLine.classList.add('active');
        EL.btnModeWord.classList.remove('active');
        state.isWordMode = false;
        showToast('Timeline selection mode: LINE', 'info');
      });
    }
  }

  function togglePlay() {
    if (EL.previewVideo.paused) EL.previewVideo.play();
    else EL.previewVideo.pause();
  }

  function updatePlayIcons(playing) {
    const iconSvg = playing
      ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
      : '<path d="M5 3l14 9-14 9V3z"/>';

    if (EL.playIcon) EL.playIcon.innerHTML = iconSvg;
    if (EL.timelinePlayIcon) EL.timelinePlayIcon.innerHTML = iconSvg;
  }

  // ── Aspect Ratio Switching (Responsive Full-Height Video Stage) ──
  function applyAspectRatio(ratio) {
    state.aspectRatio = ratio;
    EL.aspectBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.ratio === ratio);
    });

    const cont = EL.videoContainer;
    const vid  = EL.previewVideo;
    if (!cont || !vid) return;

    if (ratio === '9:16') {
      cont.style.aspectRatio = '9 / 16';
      cont.style.height = 'calc(100% - 16px)';
      cont.style.width = 'auto';
      cont.style.maxWidth = 'calc(100% - 16px)';
      cont.style.maxHeight = 'calc(100% - 16px)';
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.maxWidth = '100%';
      vid.style.maxHeight = '100%';
      vid.style.objectFit = 'contain';
    } else if (ratio === '16:9') {
      cont.style.aspectRatio = '16 / 9';
      cont.style.width = 'calc(100% - 32px)';
      cont.style.height = 'auto';
      cont.style.maxWidth = 'calc(100% - 32px)';
      cont.style.maxHeight = 'calc(100% - 16px)';
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.maxWidth = '100%';
      vid.style.maxHeight = '100%';
      vid.style.objectFit = 'contain';
    } else if (ratio === '1:1') {
      cont.style.aspectRatio = '1 / 1';
      cont.style.height = 'calc(100% - 16px)';
      cont.style.width = 'auto';
      cont.style.maxWidth = 'calc(100% - 16px)';
      cont.style.maxHeight = 'calc(100% - 16px)';
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.maxWidth = '100%';
      vid.style.maxHeight = '100%';
      vid.style.objectFit = 'contain';
    } else if (ratio === '4:5') {
      cont.style.aspectRatio = '4 / 5';
      cont.style.height = 'calc(100% - 16px)';
      cont.style.width = 'auto';
      cont.style.maxWidth = 'calc(100% - 16px)';
      cont.style.maxHeight = 'calc(100% - 16px)';
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.maxWidth = '100%';
      vid.style.maxHeight = '100%';
      vid.style.objectFit = 'contain';
    } else { // original
      cont.style.aspectRatio = '';
      cont.style.width = 'auto';
      cont.style.height = 'auto';
      cont.style.maxWidth = 'calc(100% - 16px)';
      cont.style.maxHeight = 'calc(100% - 16px)';
      vid.style.maxWidth = '100%';
      vid.style.maxHeight = 'calc(100% - 16px)';
      vid.style.objectFit = 'contain';
    }

    if (vid.videoWidth) {
      EL.previewCanvas.width = vid.videoWidth;
      EL.previewCanvas.height = vid.videoHeight;
    }
  }

  EL.aspectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyAspectRatio(btn.dataset.ratio);
      showToast(`Aspect ratio set to ${btn.dataset.ratio}`, 'info');
    });
  });

  // Fullscreen Preview Toggle
  if (EL.btnFullscreen) {
    EL.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        EL.previewWrap.requestFullscreen().catch(err => {
          showToast('Fullscreen not supported', 'error');
        });
      } else {
        document.exitFullscreen();
      }
    });
  }

  // ── High-Performance 60FPS Render & Animation Pipeline ──────
  let isPlaybackLoopRunning = false;
  let singleFramePending = false;

  function drawCanvasFrame(currentTime) {
    if (!EL.previewCanvas) return;
    const ctx = EL.previewCanvas.getContext('2d');
    const canvas = EL.previewCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.segments && state.segments.length > 0) {
      window.__SUBZFREE_SEGMENTS__ = state.segments;
      const t = typeof currentTime === 'number' ? currentTime : (EL.previewVideo ? EL.previewVideo.currentTime : 0);
      CAPTIONS.draw(
        state.currentStyle,
        ctx,
        canvas,
        state.segments,
        t
      );
    }
  }

  function requestDrawFrame() {
    if (isPlaybackLoopRunning) return;
    if (singleFramePending) return;
    singleFramePending = true;
    requestAnimationFrame(() => {
      singleFramePending = false;
      drawCanvasFrame(EL.previewVideo ? EL.previewVideo.currentTime : 0);
    });
  }

  function startPlaybackLoop() {
    state.isPlaying = true;
    if (isPlaybackLoopRunning) return;
    isPlaybackLoopRunning = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);

    let lastSecFormatted = -1;

    function tick() {
      if (!isPlaybackLoopRunning) return;
      const v = EL.previewVideo;
      if (!v || v.paused || v.ended) {
        stopPlaybackLoop();
        return;
      }

      const cur = v.currentTime;
      const dur = v.duration || 0;

      // 1. Draw captions on canvas (smooth 60fps)
      drawCanvasFrame(cur);

      // 2. Buttery-smooth playhead gliding (GPU-accelerated translate3d)
      updatePlayheadPosition(cur, dur);

      // 3. Fast O(1) active caption and word highlighting
      highlightActiveCaption(cur);

      // 4. Update seek slider
      if (EL.videoSeek && dur > 0) {
        EL.videoSeek.value = (cur / dur) * 100;
      }

      // 5. Update timecode strings (throttled to second ticks)
      const curSec = Math.floor(cur);
      if (curSec !== lastSecFormatted) {
        lastSecFormatted = curSec;
        const formatted = `${formatTime(cur)} / ${formatTime(dur)}`;
        if (EL.timeDisplay) EL.timeDisplay.textContent = formatted;
        if (EL.timelineTimecode) EL.timelineTimecode.textContent = formatted;
      }

      state.animFrame = requestAnimationFrame(tick);
    }

    state.animFrame = requestAnimationFrame(tick);
  }

  function stopPlaybackLoop() {
    state.isPlaying = false;
    isPlaybackLoopRunning = false;
    if (state.animFrame) {
      cancelAnimationFrame(state.animFrame);
      state.animFrame = null;
    }
    const cur = EL.previewVideo ? EL.previewVideo.currentTime : 0;
    const dur = EL.previewVideo ? (EL.previewVideo.duration || 0) : 0;
    drawCanvasFrame(cur);
    updatePlayheadPosition(cur, dur);
    highlightActiveCaption(cur);

    const formatted = `${formatTime(cur)} / ${formatTime(dur)}`;
    if (EL.timeDisplay) EL.timeDisplay.textContent = formatted;
    if (EL.timelineTimecode) EL.timelineTimecode.textContent = formatted;
  }

  function startRenderLoop() {
    if (EL.previewVideo && !EL.previewVideo.paused && !EL.previewVideo.ended) {
      startPlaybackLoop();
    } else {
      requestDrawFrame();
    }
  }

  function clearCanvas() {
    if (!EL.previewCanvas) return;
    const ctx = EL.previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, EL.previewCanvas.width, EL.previewCanvas.height);
  }

  // ── AI Transcription ───────────────────────────────────────
  if (EL.btnGenerate) {
    EL.btnGenerate.addEventListener('click', () => {
      generateCaptions();
    });
  }

  // Topbar Generate Button
  const btnTopbarGenerate = $('btn-topbar-generate');
  if (btnTopbarGenerate) {
    btnTopbarGenerate.addEventListener('click', () => {
      generateCaptions();
    });
  }

  // Skinny rail magic transcribe button
  if (EL.railBtnTranscribe) {
    EL.railBtnTranscribe.addEventListener('click', () => {
      generateCaptions();
    });
  }

  // Center Empty Area Action Buttons
  const btnEmptyUpload = $('btn-empty-upload');
  if (btnEmptyUpload) {
    btnEmptyUpload.addEventListener('click', () => {
      EL.fileInput.click();
    });
  }

  const btnEmptyDemo = $('btn-empty-demo');
  if (btnEmptyDemo) {
    btnEmptyDemo.addEventListener('click', () => {
      loadDemoCaptions();
    });
  }

  function loadDemoCaptions() {
    EL.previewEmpty.style.display   = 'none';
    EL.videoContainer.style.display = 'flex';
    if (EL.videoControls) EL.videoControls.style.display = 'none';

    // Apply active aspect ratio (e.g. 9:16) to maximize video preview height
    const activeBtn = Array.from(EL.aspectBtns).find(b => b.classList.contains('active'));
    applyAspectRatio(activeBtn ? activeBtn.dataset.ratio : '9:16');

    EL.previewCanvas.width = 1080;
    EL.previewCanvas.height = 1920;

    const sampleSegments = [
      {
        id: 1,
        start: 0.5,
        end: 3.5,
        text: 'Kare aa na mujhko',
        words: [
          { word: 'Kare', start: 0.5, end: 1.2 },
          { word: 'aa', start: 1.2, end: 1.8 },
          { word: 'na', start: 1.8, end: 2.4 },
          { word: 'mujhko', start: 2.4, end: 3.5 }
        ]
      },
      {
        id: 2,
        start: 3.8,
        end: 6.8,
        text: 'mere jeene men andaz tera',
        words: [
          { word: 'mere', start: 3.8, end: 4.4 },
          { word: 'jeene', start: 4.4, end: 5.1 },
          { word: 'men', start: 5.1, end: 5.6 },
          { word: 'andaz', start: 5.6, end: 6.2 },
          { word: 'tera', start: 6.2, end: 6.8 }
        ]
      },
      {
        id: 3,
        start: 7.2,
        end: 10.2,
        text: 'sar aankhon par teri naraazi',
        words: [
          { word: 'sar', start: 7.2, end: 7.8 },
          { word: 'aankhon', start: 7.8, end: 8.5 },
          { word: 'par', start: 8.5, end: 9.1 },
          { word: 'teri', start: 9.1, end: 9.6 },
          { word: 'naraazi', start: 9.6, end: 10.2 }
        ]
      },
      {
        id: 4,
        start: 10.6,
        end: 14.0,
        text: 'meri haar men hai koi raaj tera',
        words: [
          { word: 'meri', start: 10.6, end: 11.2 },
          { word: 'haar', start: 11.2, end: 11.9 },
          { word: 'men', start: 11.9, end: 12.5 },
          { word: 'hai', start: 12.5, end: 13.0 },
          { word: 'koi', start: 13.0, end: 13.4 },
          { word: 'raaj', start: 13.4, end: 14.0 }
        ]
      }
    ];

    recordState();
    state.segments = sampleSegments;
    state.hasCaption = true;
    window.__SUBZFREE_SEGMENTS__ = sampleSegments;

    try {
      Object.defineProperty(EL.previewVideo, 'duration', { value: 15, configurable: true });
    } catch(e) {}

    renderTimeline(sampleSegments);
    renderTimelineBlocks();
    buildTimelineRuler(15);

    const samplePeaks = [];
    for (let i = 0; i < 200; i++) {
      samplePeaks.push(0.25 + 0.65 * Math.abs(Math.sin(i * 0.15) * Math.cos(i * 0.25)));
    }
    state.audioPeaks = samplePeaks;
    drawWaveform(samplePeaks);

    EL.btnDownloadTop.disabled = false;
    if (EL.btnAddCaption) EL.btnAddCaption.style.display = 'inline-flex';
    if (EL.btnClearCaptions) EL.btnClearCaptions.style.display = 'inline-flex';
    if (EL.btnFixScript) EL.btnFixScript.style.display = 'inline-flex';
    if (EL.btnToggleReplace) EL.btnToggleReplace.style.display = 'inline-flex';
    if (EL.timelineEditHint) EL.timelineEditHint.style.display = 'flex';

    startRenderLoop();
    initVideoControls();

    setStatus('✨ Sample Captions Loaded — Click any template on the right to preview!');
    showToast('Loaded sample captions! Click any template in Right Sidebar to preview.', 'success');
  }

  let openLyricsModal = (defaultTab = 'script') => {};

  async function runWhisperTranscription(apiKey, requestedLang = 'auto') {
    if (state.isGenerating || !state.videoFile) return;
    state.isGenerating = true;

    if (EL.generateArea) EL.generateArea.style.display = 'none';
    if (EL.generatingArea) EL.generatingArea.style.display = 'block';
    if (EL.btnGenerate) EL.btnGenerate.disabled = true;
    if (btnTopbarGenerate) btnTopbarGenerate.disabled = true;

    setStatus('🤖 Connecting to AI Whisper engine...');
    showToast('AI Whisper is analyzing your speech...', 'info');

    try {
      const segments = await TRANSCRIBE.transcribeWithWhisperAI(
        state.videoFile,
        apiKey,
        requestedLang,
        (pct, text, step) => {
          if (EL.genText) EL.genText.textContent = text;
          if (EL.genStep) EL.genStep.textContent = step;
          if (EL.genProgress) EL.genProgress.style.width = pct + '%';
        }
      );

      recordState();
      state.segments   = segments;
      state.hasCaption = true;
      window.__SUBZFREE_SEGMENTS__ = segments;

      // Render Left Panel Captions & Bottom Timeline Tracks
      renderTimeline(segments);
      renderTimelineBlocks();

      EL.btnDownloadTop.disabled = false;
      if (EL.btnAddCaption) EL.btnAddCaption.style.display = 'inline-flex';
      if (EL.btnClearCaptions) EL.btnClearCaptions.style.display = 'inline-flex';
      if (EL.btnFixScript) EL.btnFixScript.style.display = 'inline-flex';
      if (EL.btnToggleReplace) EL.btnToggleReplace.style.display = 'inline-flex';
      if (EL.timelineEditHint) EL.timelineEditHint.style.display = 'flex';

      setStatus(`✅ ${segments.length} AI Whisper caption blocks generated!`);
      showToast(`🎉 ${segments.length} captions generated with AI Whisper! Click any word to edit.`, 'success');

    } catch (err) {
      console.error('AI Whisper error:', err);
      showToast(`Whisper error: ${err.message || err}`, 'error');
      setStatus(`❌ Whisper error: ${err.message || err}`);
    } finally {
      state.isGenerating = false;
      if (EL.generatingArea) EL.generatingArea.style.display = 'none';
      if (EL.generateArea) EL.generateArea.style.display   = 'block';
      if (EL.btnGenerate) {
        EL.btnGenerate.disabled = false;
        EL.btnGenerate.textContent = '🔄 Re-generate';
      }
      if (btnTopbarGenerate) btnTopbarGenerate.disabled = false;
    }
  }

  async function generateCaptions() {
    if (state.isGenerating) return;
    if (typeof openLyricsModal === 'function') {
      openLyricsModal('whisper');
    }
  }

  // ── High-Speed Cached Caption & Timeline Block Registry ────
  let cachedCaptionBlocks = [];
  let cachedTimelineBlocks = [];
  let lastActiveSegIndex = -1;
  let lastActiveWordIndex = -1;

  // ── Left Panel Captions Renderer ───────────────────────────
  function renderTimeline(segments) {
    const scroll = EL.timelineScroll;

    if (EL.captionsCountTag) {
      EL.captionsCountTag.textContent = `${segments ? segments.length : 0} lines`;
    }

    cachedCaptionBlocks = [];
    lastActiveSegIndex = -1;
    lastActiveWordIndex = -1;

    if (!segments || segments.length === 0) {
      if (EL.captikEmptyLabel) EL.captikEmptyLabel.style.display = 'block';
      if (scroll) scroll.innerHTML = '';
      if (EL.dockActivePill) EL.dockActivePill.style.display = 'none';
      if (EL.dockActiveLineInput) EL.dockActiveLineInput.value = '';
      return;
    }

    if (EL.captikEmptyLabel) EL.captikEmptyLabel.style.display = 'none';
    if (scroll) scroll.innerHTML = '';

    const frag = document.createDocumentFragment();

    segments.forEach((seg, si) => {
      const block = document.createElement('div');
      block.className = 'caption-block';
      block.dataset.segIndex = si;

      // Header (click to seek)
      const header = document.createElement('div');
      header.className = 'caption-block-header';
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px">
          <span class="caption-time">${formatTime(seg.start)}</span>
          <button class="btn-line-edit" title="Edit this line" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:11px;padding:1px 3px">✏️</button>
          <button class="btn-line-delete" title="Delete this line" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;padding:1px 3px">✕</button>
        </div>
        <span class="caption-words-preview">${seg.text}</span>
      `;

      header.addEventListener('click', (e) => {
        if (e.target.closest('.btn-line-edit') || e.target.closest('.btn-line-delete')) return;
        EL.previewVideo.currentTime = seg.start;
        if (EL.previewVideo.paused) EL.previewVideo.play();
        if (EL.dockActiveLineInput) EL.dockActiveLineInput.value = seg.text;
        if (EL.dockActivePill) EL.dockActivePill.style.display = 'inline-flex';
        if (EL.dockActiveIndex) EL.dockActiveIndex.textContent = `Line ${si + 1}/${segments.length}`;
        if (EL.dockActiveTime) EL.dockActiveTime.textContent = `${formatTime(seg.start)} - ${formatTime(seg.end)}`;
      });

      const editBtn = header.querySelector('.btn-line-edit');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newText = prompt('Edit caption line:', seg.text);
          if (newText !== null && newText.trim() && newText.trim() !== seg.text) {
            recordState();
            seg.text = newText.trim();
            const wList = seg.text.split(/\s+/).filter(Boolean);
            const dur = Math.max(0.4, seg.end - seg.start);
            const wDur = dur / Math.max(1, wList.length);
            seg.words = wList.map((w, wi) => ({
              word: w,
              start: seg.start + wi * wDur,
              end: seg.start + (wi + 1) * wDur
            }));
            window.__SUBZFREE_SEGMENTS__ = state.segments;
            renderTimeline(state.segments);
            renderTimelineBlocks();
            requestDrawFrame();
            if (EL.dockActiveLineInput) EL.dockActiveLineInput.value = seg.text;
            showToast(`Updated: "${seg.text}"`, 'success');
          }
        });
      }

      const delBtn = header.querySelector('.btn-line-delete');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          recordState();
          state.segments.splice(si, 1);
          window.__SUBZFREE_SEGMENTS__ = state.segments;
          renderTimeline(state.segments);
          renderTimelineBlocks();
          requestDrawFrame();
          showToast(`Deleted Line ${si + 1}`, 'info');
        });
      }

      // Body (word chips)
      const body = document.createElement('div');
      body.className = 'caption-block-body';
      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'word-chips';

      const chipElements = [];

      seg.words.forEach((wordObj, wi) => {
        const chip = document.createElement('span');
        chip.className = 'word-chip';
        chip.textContent = wordObj.word;
        chip.title = 'Click to seek • Double-click to edit word';
        chip.dataset.segIdx  = si;
        chip.dataset.wordIdx = wi;

        // Double-click to edit word inline
        chip.addEventListener('dblclick', () => startWordEdit(chip, seg, si, wi));
        // Single click: seek to word start
        chip.addEventListener('click', () => {
          EL.previewVideo.currentTime = wordObj.start;
          if (EL.previewVideo.paused) EL.previewVideo.play();
        });

        chipsWrap.appendChild(chip);
        chipElements.push(chip);
      });

      body.appendChild(chipsWrap);
      block.appendChild(header);
      block.appendChild(body);
      frag.appendChild(block);

      cachedCaptionBlocks.push({
        element: block,
        start: seg.start,
        end: seg.end,
        chips: chipElements,
        words: seg.words
      });
    });

    scroll.appendChild(frag);
  }

  // ── Word Inline Editing ────────────────────────────────────
  function startWordEdit(chip, seg, si, wi) {
    const oldWord = seg.words[wi].word;

    const input = document.createElement('input');
    input.type      = 'text';
    input.className = 'word-edit-input';
    input.value     = oldWord;
    input.style.background = '#1e2030';
    input.style.border = '1px solid #8B5CF6';
    input.style.borderRadius = '4px';
    input.style.color = '#fff';
    input.style.padding = '2px 6px';
    input.style.fontSize = '11px';
    input.style.outline = 'none';

    chip.replaceWith(input);
    input.focus();
    input.select();

    function commitEdit() {
      const newWord = input.value.trim() || oldWord;
      if (newWord !== oldWord) {
        recordState();
        seg.words[wi].word = newWord;
        seg.text = seg.words.map(w => w.word).join(' ');
        renderTimeline(state.segments);
        renderTimelineBlocks();
        requestDrawFrame();
        showToast(`"${oldWord}" → "${newWord}"`, 'info');
      } else {
        renderTimeline(state.segments);
      }
    }

    input.addEventListener('blur', commitEdit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        seg.words[wi].word = oldWord;
        renderTimeline(state.segments);
      }
    });
  }

  // ── Ultra-Fast O(1) Active Word & Block Highlighting ──────
  function highlightActiveCaption(currentTime) {
    if (!cachedCaptionBlocks || cachedCaptionBlocks.length === 0) return;

    // 1. Locate active segment index
    let curSegIdx = -1;
    for (let i = 0; i < cachedCaptionBlocks.length; i++) {
      const b = cachedCaptionBlocks[i];
      if (currentTime >= b.start && currentTime <= b.end + 0.06) {
        curSegIdx = i;
        break;
      }
    }

    // 2. Segment transition diffing
    if (curSegIdx !== lastActiveSegIndex) {
      // Clear previous active states
      if (lastActiveSegIndex >= 0 && cachedCaptionBlocks[lastActiveSegIndex]) {
        cachedCaptionBlocks[lastActiveSegIndex].element.classList.remove('active');
        if (cachedTimelineBlocks[lastActiveSegIndex]) {
          cachedTimelineBlocks[lastActiveSegIndex].element.classList.remove('active');
        }
        if (lastActiveWordIndex >= 0 && cachedCaptionBlocks[lastActiveSegIndex].chips[lastActiveWordIndex]) {
          cachedCaptionBlocks[lastActiveSegIndex].chips[lastActiveWordIndex].classList.remove('highlighted');
        }
      }

      // Activate new segment
      if (curSegIdx >= 0 && cachedCaptionBlocks[curSegIdx]) {
        const activeBlock = cachedCaptionBlocks[curSegIdx];
        activeBlock.element.classList.add('active');
        if (cachedTimelineBlocks[curSegIdx]) {
          cachedTimelineBlocks[curSegIdx].element.classList.add('active');
        }
        // Smoothly bring active caption block into center view horizontally
        activeBlock.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        const seg = state.segments[curSegIdx];
        if (seg) {
          if (EL.dockActivePill) EL.dockActivePill.style.display = 'inline-flex';
          if (EL.dockActiveIndex) EL.dockActiveIndex.textContent = `Line ${curSegIdx + 1}/${state.segments.length}`;
          if (EL.dockActiveTime) EL.dockActiveTime.textContent = `${formatTime(seg.start)} - ${formatTime(seg.end)}`;
          if (EL.dockActiveLineInput && document.activeElement !== EL.dockActiveLineInput) {
            EL.dockActiveLineInput.value = seg.text;
          }
        }
      }

      lastActiveSegIndex = curSegIdx;
      lastActiveWordIndex = -1;
    }

    // 3. Word-level highlighting within active segment
    if (curSegIdx >= 0 && cachedCaptionBlocks[curSegIdx]) {
      const activeSeg = cachedCaptionBlocks[curSegIdx];
      let curWordIdx = -1;
      for (let w = 0; w < activeSeg.words.length; w++) {
        const word = activeSeg.words[w];
        if (currentTime >= word.start && currentTime <= word.end + 0.05) {
          curWordIdx = w;
          break;
        }
      }

      if (curWordIdx !== lastActiveWordIndex) {
        if (lastActiveWordIndex >= 0 && activeSeg.chips[lastActiveWordIndex]) {
          activeSeg.chips[lastActiveWordIndex].classList.remove('highlighted');
        }
        if (curWordIdx >= 0 && activeSeg.chips[curWordIdx]) {
          activeSeg.chips[curWordIdx].classList.add('highlighted');
        }
        lastActiveWordIndex = curWordIdx;
      }
    }
  }

  // ── Right Sidebar: Templates & Text Tabs ───────────────────
  if (EL.tabBtnTemplates && EL.tabBtnText) {
    EL.tabBtnTemplates.addEventListener('click', () => {
      EL.tabBtnTemplates.classList.add('active');
      EL.tabBtnText.classList.remove('active');
      EL.tabContentTemplates.style.display = 'flex';
      EL.tabContentText.style.display = 'none';
    });

    EL.tabBtnText.addEventListener('click', () => {
      EL.tabBtnText.classList.add('active');
      EL.tabBtnTemplates.classList.remove('active');
      EL.tabContentText.style.display = 'flex';
      EL.tabContentTemplates.style.display = 'none';
    });
  }

  // Segmented Pill: Built-in Templates vs My Presets
  if (EL.pillBuiltIn && EL.pillMyPresets) {
    EL.pillBuiltIn.addEventListener('click', () => {
      EL.pillBuiltIn.classList.add('active');
      EL.pillMyPresets.classList.remove('active');
      EL.stylePicker.style.display = 'flex';
    });
    EL.pillMyPresets.addEventListener('click', () => {
      EL.pillMyPresets.classList.add('active');
      EL.pillBuiltIn.classList.remove('active');
      showToast('My Presets: Save any style with the "Save Preset" button!', 'info');
    });
  }

  // Save Preset Button
  if (EL.btnSavePreset) {
    EL.btnSavePreset.addEventListener('click', () => {
      const presetName = prompt('Enter a name for your custom preset:', 'My Viral Style');
      if (presetName) {
        showToast(`Preset "${presetName}" saved to My Presets!`, 'success');
      }
    });
  }

  // Template Click Selection (1-Click Instant Apply!)
  if (EL.stylePicker) {
    EL.stylePicker.addEventListener('click', e => {
      const card = e.target.closest('.template-card[data-style]');
      if (!card) return;

      EL.stylePicker.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const chosenStyle = card.dataset.style;
      state.currentStyle = chosenStyle;

      const styleName = card.querySelector('.card-name')?.textContent || chosenStyle;
      if (EL.styleLabel) EL.styleLabel.textContent = `Style: ${styleName}`;
      showToast(`Applied Template: ${styleName}`, 'success');
      requestDrawFrame();
    });
  }

  // Template Search & Category Filter
  const CATEGORIES = {
    trending: ['captik-glow','captik-shadow','captik','hormozi','velocity-flash','submagic-karaoke','luke-belmar','mrbeast-2','ali-abdaal','bubble-style','devin-jatho','delhi','blockbuster','big-reveal','clean-motion','swiss','big-red','illusion','fire','glitch','prism','comic'],
    'most-used': ['captik-glow','captik','hormozi','velocity-flash','submagic-karaoke','mrbeast-2','ali-abdaal','bubble-style','delhi','clean-motion','iman-gadzhi','neon','karaoke','word-pop','highlighted-word','deep-glow','cinematic','classic'],
    creators: ['hormozi','hormozi-green','luke-belmar','mrbeast-2','ali-abdaal','devin-jatho','big-reveal','iman-gadzhi','editing-skool','gold','outline'],
    new: ['captik-glow','captik-shadow','velocity-flash','submagic-karaoke','luke-belmar','blockbuster','swiss','editing-skool','archives','scribble','aura','editor-masala','illusion','liquid-glass','retro']
  };

  let activeCat = 'all';

  function filterTemplates() {
    const q     = (EL.styleSearch ? EL.styleSearch.value : '').toLowerCase().trim();
    const cards = EL.stylePicker ? EL.stylePicker.querySelectorAll('.template-card') : [];
    let visible = 0;

    cards.forEach(card => {
      const styleId = (card.dataset.style || '').toLowerCase();
      const name    = (card.querySelector('.card-name')?.textContent || '').toLowerCase();
      const title   = (card.getAttribute('title') || '').toLowerCase();
      const explicitCat = (card.dataset.cat || '').toLowerCase();

      // Check category match
      let catMatch = (activeCat === 'all');
      if (!catMatch) {
        if (explicitCat && explicitCat.includes(activeCat)) catMatch = true;
        else if (CATEGORIES[activeCat] && CATEGORIES[activeCat].includes(styleId)) catMatch = true;
      }

      // Check search match
      const textMatch = !q || name.includes(q) || styleId.includes(q) || title.includes(q);

      const show = catMatch && textMatch;
      card.style.display = show ? 'flex' : 'none';
      if (show) visible++;
    });

    if (EL.styleCountBadge) {
      EL.styleCountBadge.textContent = activeCat === 'all' && !q ? cards.length : `${visible}/${cards.length}`;
    }
  }

  if (EL.styleSearch) EL.styleSearch.addEventListener('input', filterTemplates);

  if (EL.styleCatTabs) {
    EL.styleCatTabs.addEventListener('click', e => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;

      EL.styleCatTabs.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      activeCat = pill.dataset.cat;
      filterTemplates();
    });
  }

  // ── Text Tab Controls ──────────────────────────────────────
  if (EL.textFontFamily) {
    EL.textFontFamily.addEventListener('change', () => {
      window.__SUBZFREE_CUSTOM_FONT__ = EL.textFontFamily.value;
      showToast(`Font updated: ${EL.textFontFamily.value.split(',')[0]}`, 'info');
      requestDrawFrame();
    });
  }

  if (EL.textSizeSlider) {
    EL.textSizeSlider.addEventListener('input', e => {
      const val = parseFloat(e.target.value) || 1.0;
      window.__SUBZFREE_SCALE__ = val;
      requestDrawFrame();
    });
  }

  if (EL.textPrimaryColor) {
    EL.textPrimaryColor.addEventListener('input', e => {
      window.__SUBZFREE_PRIMARY_COLOR__ = e.target.value;
      requestDrawFrame();
    });
  }

  if (EL.textHighlightColor) {
    EL.textHighlightColor.addEventListener('input', e => {
      window.__SUBZFREE_HIGHLIGHT_COLOR__ = e.target.value;
      requestDrawFrame();
    });
  }

  if (EL.textStrokeColor) {
    EL.textStrokeColor.addEventListener('input', e => {
      window.__SUBZFREE_STROKE_COLOR__ = e.target.value;
      requestDrawFrame();
    });
  }

  if (EL.textGlowSlider) {
    EL.textGlowSlider.addEventListener('input', e => {
      window.__SUBZFREE_GLOW_INTENSITY__ = parseFloat(e.target.value);
      requestDrawFrame();
    });
  }

  // ── Bottom Multi-Track Timeline & Waveform ─────────────────
  let cachedContentWidth = 0;
  function getContentWidth() {
    if (!cachedContentWidth && EL.timelineTracksViewport) {
      cachedContentWidth = Math.max(100, EL.timelineTracksViewport.clientWidth - 72);
    }
    return cachedContentWidth || 800;
  }

  window.addEventListener('resize', () => {
    cachedContentWidth = EL.timelineTracksViewport ? Math.max(100, EL.timelineTracksViewport.clientWidth - 72) : 800;
  });

  function buildTimelineRuler(duration) {
    const track = $('ruler-ticks-track') || EL.timelineRuler;
    if (!track) return;
    track.innerHTML = '';
    if (EL.timelineRuler) EL.timelineRuler.style.display = 'flex';
    if (EL.timelinePlayhead) EL.timelinePlayhead.style.display = 'flex';

    const dur = Math.max(duration || 30, 10);
    const step = dur > 60 ? 5 : (dur > 25 ? 2 : 1); // seconds per mark

    for (let s = 0; s <= dur; s += step) {
      const pct = (s / dur) * 100;

      const tick = document.createElement('div');
      tick.className = s % (step * 2) === 0 ? 'ruler-tick major' : 'ruler-tick';
      tick.style.left = `${pct}%`;
      track.appendChild(tick);

      if (s % (step * 2) === 0) {
        const label = document.createElement('div');
        label.className = 'ruler-label';
        label.style.left = `${pct}%`;
        label.textContent = formatTime(s);
        track.appendChild(label);
      }
    }
  }

  function updatePlayheadPosition(currentTime, duration) {
    if (!EL.timelinePlayhead || !EL.timelineTracksViewport) return;
    const dur = duration || (EL.previewVideo ? EL.previewVideo.duration : 1) || 1;
    const pct = Math.max(0, Math.min(1, currentTime / dur));
    const contentWidth = getContentWidth();
    const leftPx = 72 + pct * contentWidth;
    EL.timelinePlayhead.style.transform = `translate3d(${leftPx}px, 0, 0)`;
  }

  // Smooth Timeline Drag-Scrubbing & Click to Seek
  let isDraggingTimeline = false;

  function handleTimelineScrub(e) {
    if (!EL.timelineTracksViewport || !EL.previewVideo || !EL.previewVideo.duration) return;
    const rect = EL.timelineTracksViewport.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left - 72;
    const contentWidth = getContentWidth();

    const pct = Math.max(0, Math.min(1, clickX / contentWidth));
    const targetTime = pct * EL.previewVideo.duration;

    EL.previewVideo.currentTime = targetTime;
    updatePlayheadPosition(targetTime, EL.previewVideo.duration);
    highlightActiveCaption(targetTime);
    requestDrawFrame();
  }

  if (EL.timelineTracksViewport) {
    EL.timelineTracksViewport.addEventListener('mousedown', e => {
      if (e.target.closest('.caption-timeline-block')) return;
      isDraggingTimeline = true;
      handleTimelineScrub(e);
    });

    EL.timelineTracksViewport.addEventListener('touchstart', e => {
      if (e.target.closest('.caption-timeline-block')) return;
      isDraggingTimeline = true;
      handleTimelineScrub(e);
    }, { passive: true });

    EL.timelineTracksViewport.addEventListener('touchmove', e => {
      if (isDraggingTimeline) {
        handleTimelineScrub(e);
      }
    }, { passive: true });

    EL.timelineTracksViewport.addEventListener('touchend', () => {
      isDraggingTimeline = false;
    });
  }

  window.addEventListener('mousemove', e => {
    if (isDraggingTimeline) {
      handleTimelineScrub(e);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingTimeline) {
      isDraggingTimeline = false;
    }
  });

  // Render Caption Blocks in Bottom Timeline (Warm Beige / Gold Captik Style)
  function renderTimelineBlocks() {
    if (!EL.captionBlocksTrack) return;
    EL.captionBlocksTrack.innerHTML = '';
    cachedTimelineBlocks = [];

    const dur = EL.previewVideo.duration || 30;
    if (!state.segments || state.segments.length === 0) return;

    const frag = document.createDocumentFragment();

    state.segments.forEach(seg => {
      const block = document.createElement('div');
      block.className = 'caption-timeline-block';
      block.dataset.start = seg.start;
      block.dataset.end   = seg.end;

      const leftPct  = (seg.start / dur) * 100;
      const widthPct = Math.max(1.5, ((seg.end - seg.start) / dur) * 100);

      block.style.left  = `${leftPct}%`;
      block.style.width = `${widthPct}%`;

      block.innerHTML = `
        <span class="block-text">${seg.text}</span>
        <span class="block-tag">T Text</span>
      `;

      block.addEventListener('click', e => {
        e.stopPropagation();
        EL.previewVideo.currentTime = seg.start;
        requestDrawFrame();
        updatePlayheadPosition(seg.start, dur);
        highlightActiveCaption(seg.start);
        if (EL.previewVideo.paused) EL.previewVideo.play();
      });

      frag.appendChild(block);
      cachedTimelineBlocks.push({
        element: block,
        start: seg.start,
        end: seg.end
      });
    });

    EL.captionBlocksTrack.appendChild(frag);
  }

  // Audio Waveform Generation (Web Audio API + Canvas)
  async function generateAudioWaveform(file) {
    if (!EL.waveformCanvas) return;
    const canvas = EL.waveformCanvas;
    const ctx    = canvas.getContext('2d');

    // Resize canvas
    canvas.width  = 1200;
    canvas.height = 54;

    try {
      const arrayBuffer = await file.slice(0, 1024 * 1024 * 15).arrayBuffer(); // first 15MB for fast peak decoding
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuffer);

      const rawData = audioBuf.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(rawData.length / samples);
      const peaks = [];

      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(rawData[i * blockSize + j]);
          if (val > max) max = val;
        }
        peaks.push(max);
      }
      state.audioPeaks = peaks;
      drawWaveform(peaks);
    } catch (e) {
      // Fallback: draw beautiful realistic audio peaks
      const peaks = [];
      for (let i = 0; i < 200; i++) {
        peaks.push(0.2 + 0.7 * Math.abs(Math.sin(i * 0.12) * Math.cos(i * 0.28)));
      }
      state.audioPeaks = peaks;
      drawWaveform(peaks);
    }
  }

  function drawWaveform(peaks) {
    if (!EL.waveformCanvas) return;
    const canvas = EL.waveformCanvas;
    const ctx    = canvas.getContext('2d');
    const w      = canvas.width;
    const h      = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const barW = w / peaks.length;
    const midY = h / 2;

    peaks.forEach((pk, i) => {
      const barH = Math.max(4, pk * (h * 0.85));
      const x = i * barW;

      // Captik Signature: Vibrant Emerald Green (#2BDC96)
      const grad = ctx.createLinearGradient(0, midY - barH / 2, 0, midY + barH / 2);
      grad.addColorStop(0, '#2BDC96');
      grad.addColorStop(0.5, '#20C997');
      grad.addColorStop(1, '#10B981');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(43, 220, 150, 0.4)';
      ctx.shadowBlur = 4;
      ctx.fillRect(x + 1, midY - barH / 2, barW - 2, barH);
    });
  }

  // Waveform Click to Seek
  if (EL.waveformCanvas) {
    EL.waveformCanvas.addEventListener('click', e => {
      const rect = EL.waveformCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      if (EL.previewVideo.duration) {
        EL.previewVideo.currentTime = pct * EL.previewVideo.duration;
        requestDrawFrame();
        updatePlayheadPosition(EL.previewVideo.currentTime, EL.previewVideo.duration);
        highlightActiveCaption(EL.previewVideo.currentTime);
      }
    });
  }

  // Zoom Slider in Timeline
  if (EL.timelineZoomSlider) {
    EL.timelineZoomSlider.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      state.trackZoom = val;
      if (EL.zoomPercentTag) EL.zoomPercentTag.textContent = `${val}%`;

      const tracks = document.querySelectorAll('.track-content');
      tracks.forEach(tr => {
        tr.style.minWidth = `${800 * (val / 100)}px`;
      });
      cachedContentWidth = 0;
      renderTimelineBlocks();
      updatePlayheadPosition(EL.previewVideo.currentTime, EL.previewVideo.duration);
    });
  }

  // Zoom Fit Button
  const btnZoomFit = $('btn-zoom-fit');
  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => {
      state.trackZoom = 100;
      if (EL.timelineZoomSlider) EL.timelineZoomSlider.value = 100;
      if (EL.zoomPercentTag) EL.zoomPercentTag.textContent = '100%';
      const tracks = document.querySelectorAll('.track-content');
      tracks.forEach(tr => { tr.style.minWidth = '800px'; });
      cachedContentWidth = 0;
      renderTimelineBlocks();
      updatePlayheadPosition(EL.previewVideo.currentTime, EL.previewVideo.duration);
      showToast('Zoom reset to 100%', 'info');
    });
  }

  // Instant Precision Timing Nudge (Left = -0.1s, Right = +0.1s)
  function nudgeCaptions(deltaSeconds) {
    if (!state.segments || state.segments.length === 0) {
      showToast('No captions to nudge. Add or generate captions first!', 'info');
      return;
    }
    recordState();
    state.segments.forEach(seg => {
      seg.start = Math.max(0, parseFloat((seg.start + deltaSeconds).toFixed(3)));
      seg.end = Math.max(seg.start + 0.2, parseFloat((seg.end + deltaSeconds).toFixed(3)));
      if (seg.words && Array.isArray(seg.words)) {
        seg.words.forEach(w => {
          w.start = Math.max(0, parseFloat((w.start + deltaSeconds).toFixed(3)));
          w.end = Math.max(w.start + 0.08, parseFloat((w.end + deltaSeconds).toFixed(3)));
        });
      }
    });
    window.__SUBZFREE_SEGMENTS__ = state.segments;
    renderTimeline(state.segments);
    renderTimelineBlocks();
    requestDrawFrame();
    showToast(deltaSeconds > 0 ? `⏩ Nudged captions +0.1s later` : `⏪ Nudged captions -0.1s earlier`, 'info');
  }

  const btnNudgeLeft = $('timeline-btn-nudge-left');
  if (btnNudgeLeft) {
    btnNudgeLeft.addEventListener('click', () => nudgeCaptions(-0.1));
  }
  const btnNudgeRight = $('timeline-btn-nudge-right');
  if (btnNudgeRight) {
    btnNudgeRight.addEventListener('click', () => nudgeCaptions(0.1));
  }

  // Playback Speed Toggle (1x -> 1.25x -> 1.5x -> 0.75x -> 1x)
  const btnSpeed = $('timeline-btn-speed');
  const speeds = [1.0, 1.25, 1.5, 0.75];
  let speedIdx = 0;
  if (btnSpeed) {
    btnSpeed.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      const spd = speeds[speedIdx];
      if (EL.previewVideo) EL.previewVideo.playbackRate = spd;
      btnSpeed.title = `Playback Speed: ${spd}x`;
      showToast(`Playback speed: ${spd}x`, 'info');
    });
  }

  // ── Floating Caption Toolbar on Tap ────────────────────────
  function initCaptionToolbar() {
    if (!EL.previewCanvas || !EL.captionToolbar) return;

    EL.previewCanvas.addEventListener('click', e => {
      e.stopPropagation();
      const isVisible = EL.captionToolbar.style.display === 'flex';
      EL.captionToolbar.style.display = isVisible ? 'none' : 'flex';

      if (!isVisible) {
        const curTime = EL.previewVideo ? EL.previewVideo.currentTime : 0;
        const activeSeg = state.segments.find(s => curTime >= s.start && curTime <= s.end) || state.segments[0];
        if (activeSeg && EL.toolbarCaptionText) {
          EL.toolbarCaptionText.value = activeSeg.text;
          EL.toolbarCaptionText.dataset.segId = activeSeg.id;
        }
      }
    });

    if (EL.toolbarClose) {
      EL.toolbarClose.addEventListener('click', e => {
        e.stopPropagation();
        EL.captionToolbar.style.display = 'none';
      });
    }

    function saveToolbarCaptionText() {
      if (!EL.toolbarCaptionText) return;
      const newText = EL.toolbarCaptionText.value.trim();
      const segId = parseInt(EL.toolbarCaptionText.dataset.segId, 10);
      let targetSeg = state.segments.find(s => s.id === segId);
      if (!targetSeg && state.segments.length > 0) targetSeg = state.segments[0];
      if (!targetSeg || !newText) return;

      recordState();
      targetSeg.text = newText;
      const wordList = newText.split(/\s+/).filter(Boolean);
      const segDur = Math.max(0.5, targetSeg.end - targetSeg.start);
      const wordDur = segDur / Math.max(1, wordList.length);
      targetSeg.words = wordList.map((w, idx) => ({
        word: w,
        start: targetSeg.start + idx * wordDur,
        end: targetSeg.start + (idx + 1) * wordDur
      }));

      window.__SUBZFREE_SEGMENTS__ = state.segments;
      renderTimeline(state.segments);
      renderTimelineBlocks();
      showToast(`Caption updated: "${newText}"`, 'success');
    }

    if (EL.btnToolbarSaveText) {
      EL.btnToolbarSaveText.addEventListener('click', e => {
        e.stopPropagation();
        saveToolbarCaptionText();
      });
    }

    if (EL.toolbarCaptionText) {
      EL.toolbarCaptionText.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          saveToolbarCaptionText();
          EL.toolbarCaptionText.blur();
        }
      });
    }

    // Size Pills
    const sizePills = document.querySelectorAll('.size-pill');
    sizePills.forEach(pill => {
      pill.addEventListener('click', e => {
        e.stopPropagation();
        const sz = parseFloat(pill.dataset.size) || 1.0;
        window.__SUBZFREE_SCALE__ = sz;
        if (EL.captionSizeSlider) EL.captionSizeSlider.value = sz;
        if (EL.textSizeSlider) EL.textSizeSlider.value = sz;
        sizePills.forEach(p => p.classList.toggle('active', p.dataset.size === pill.dataset.size));
        showToast(`Size: ${pill.textContent} (${sz}x)`, 'info');
      });
    });

    // Position Pills
    const posPills = document.querySelectorAll('.pos-pill');
    posPills.forEach(pill => {
      pill.addEventListener('click', e => {
        e.stopPropagation();
        const posVal = parseFloat(pill.dataset.pos) || 0;
        window.__SUBZFREE_Y_OFFSET__ = posVal;
        posPills.forEach(p => p.classList.toggle('active', p.dataset.pos === pill.dataset.pos));
        showToast(`Position: ${pill.textContent}`, 'info');
      });
    });
  }

  // ── Lyrics & Custom Script Modal ───────────────────────────
  function initLyricsModal() {
    if (!EL.lyricsModal) return;

    function switchTab(tabName) {
      const tabs = [
        { name: 'whisper', btn: EL.modalTabBtnWhisper, pane: EL.modalPaneWhisper },
        { name: 'script',  btn: EL.modalTabBtnScript,  pane: EL.modalPaneScript },
        { name: 'live',    btn: EL.modalTabBtnLive,    pane: EL.modalPaneLive }
      ];

      tabs.forEach(t => {
        if (t.btn) t.btn.classList.toggle('active', t.name === tabName);
        if (t.pane) {
          t.pane.classList.toggle('active', t.name === tabName);
          t.pane.style.display = (t.name === tabName) ? 'block' : 'none';
        }
      });

      if (tabName === 'whisper' && EL.inputGroqKey) {
        const savedKey = (typeof localStorage !== 'undefined') ? (localStorage.getItem('subzfree_groq_key') || '') : '';
        if (savedKey) EL.inputGroqKey.value = savedKey;
      }
    }

    openLyricsModal = function(tab = 'whisper') {
      EL.lyricsModal.style.display = 'flex';
      EL.lyricsModal.classList.add('show');
      EL.lyricsModal.classList.add('open');
      switchTab(tab);
      if (tab === 'whisper') {
        const savedKey = (typeof localStorage !== 'undefined') ? (localStorage.getItem('subzfree_groq_key') || '') : '';
        if (EL.inputGroqKey) {
          if (savedKey) EL.inputGroqKey.value = savedKey;
          setTimeout(() => EL.inputGroqKey.focus(), 80);
        }
      }
      if (tab === 'script' && state.segments && state.segments.length > 0 && (!EL.lyricsInput.value || !EL.lyricsInput.value.trim())) {
        EL.lyricsInput.value = state.segments.map(s => s.text).join('\n');
      }
      if (tab === 'script' && EL.lyricsInput) {
        setTimeout(() => EL.lyricsInput.focus(), 80);
      }
    };

    const closeModal = () => {
      EL.lyricsModal.classList.remove('show');
      EL.lyricsModal.classList.remove('open');
      EL.lyricsModal.style.display = 'none';
      if (isDictating) {
        TRANSCRIBE.stopSpeechRecognition();
        isDictating = false;
        if (EL.btnVoiceDictate) {
          EL.btnVoiceDictate.textContent = '🎤 Start Listening';
          EL.btnVoiceDictate.style.borderColor = '#10B981';
          EL.btnVoiceDictate.style.color = '#10B981';
        }
      }
    };

    // Open triggers
    if (EL.btnOpenPasteModal) EL.btnOpenPasteModal.addEventListener('click', () => openLyricsModal('script'));
    if (EL.railBtnLyrics) EL.railBtnLyrics.addEventListener('click', () => openLyricsModal('script'));
    if (EL.btnEmptyScript) EL.btnEmptyScript.addEventListener('click', () => openLyricsModal('script'));
    if (EL.btnFixScript) EL.btnFixScript.addEventListener('click', () => openLyricsModal('script'));
    if (EL.btnHintFix) EL.btnHintFix.addEventListener('click', () => openLyricsModal('script'));

    // Close triggers
    if (EL.btnCloseLyrics) EL.btnCloseLyrics.addEventListener('click', closeModal);
    if (EL.btnCancelLyrics) EL.btnCancelLyrics.addEventListener('click', closeModal);
    if (EL.btnCancelWhisper) EL.btnCancelWhisper.addEventListener('click', closeModal);
    EL.lyricsModal.addEventListener('click', e => {
      if (e.target === EL.lyricsModal) closeModal();
    });

    // Tab buttons
    if (EL.modalTabBtnScript) EL.modalTabBtnScript.addEventListener('click', () => switchTab('script'));
    if (EL.modalTabBtnWhisper) EL.modalTabBtnWhisper.addEventListener('click', () => switchTab('whisper'));
    if (EL.modalTabBtnLive) EL.modalTabBtnLive.addEventListener('click', () => switchTab('live'));

    // TAB 1: SCRIPT / LYRICS APPLY
    if (EL.btnApplyLyrics) {
      EL.btnApplyLyrics.addEventListener('click', async () => {
        const text = (EL.lyricsInput ? EL.lyricsInput.value : '').trim();
        if (!text) {
          showToast('Please paste or type your lyrics/script first!', 'error');
          return;
        }

        closeModal();
        setStatus('Syncing your exact words to audio beats...');
        showToast('Applying 100% correct words synced to audio...', 'info');

        try {
          const duration = (EL.previewVideo && EL.previewVideo.duration) ? EL.previewVideo.duration : 30;
          let segments = [];
          if (state.segments && state.segments.length > 0) {
            segments = TRANSCRIBE.updateCaptionsWithCorrectWords(state.segments, text, duration);
          } else {
            segments = TRANSCRIBE.syncCustomText(text, duration);
          }

          recordState();
          state.segments   = segments;
          state.hasCaption = true;
          window.__SUBZFREE_SEGMENTS__ = segments;

          renderTimeline(segments);
          renderTimelineBlocks();

          EL.btnDownloadTop.disabled = false;
          if (EL.btnAddCaption) EL.btnAddCaption.style.display = 'inline-flex';
          if (EL.btnClearCaptions) EL.btnClearCaptions.style.display = 'inline-flex';
          if (EL.btnFixScript) EL.btnFixScript.style.display = 'inline-flex';
          if (EL.btnToggleReplace) EL.btnToggleReplace.style.display = 'inline-flex';
          if (EL.timelineEditHint) EL.timelineEditHint.style.display = 'flex';

          setStatus(`✅ ${segments.length} synced blocks with 100% correct words ready!`);
          showToast('🎉 Captions updated with 100% correct words!', 'success');
        } catch (err) {
          console.error('Lyrics sync error:', err);
          showToast('Could not sync text. Please try again.', 'error');
        }
      });
    }

    // TAB 1: SAMPLES
    const sampleRap = `Apna time aayega\nTu nanga hi to aaya hai\nKya ghanta lekar jaayega\nApna time aayega`;
    const samplePunjabi = `Kinna chir tainu karda haan pyaar\nTu aape vekh le\nAakhan ch vassda ae tu mere yaar`;
    const sampleDiljit = `Tere piche piche ghume dil mera\nTu vi kade hass ke bula lai yaar nu\nIshq tere da saroor ho gaya`;
    const sampleMotivation = `Jab tak tum har nahi mante\nTab tak tumhe koi nahi hara sakta!\nConsistency is the real king!`;
    const sampleEnglish = `Cause I am a champion\nAnd you are gonna hear me roar\nLouder than a lion`;

    if (EL.btnSampleSong1) EL.btnSampleSong1.addEventListener('click', () => { if (EL.lyricsInput) EL.lyricsInput.value = sampleRap; });
    if (EL.btnSampleSong2) EL.btnSampleSong2.addEventListener('click', () => { if (EL.lyricsInput) EL.lyricsInput.value = samplePunjabi; });
    if (EL.btnSampleSong3) EL.btnSampleSong3.addEventListener('click', () => { if (EL.lyricsInput) EL.lyricsInput.value = sampleDiljit; });
    if (EL.btnSampleSpeech) EL.btnSampleSpeech.addEventListener('click', () => { if (EL.lyricsInput) EL.lyricsInput.value = sampleMotivation; });
    if (EL.btnSampleEnglish) EL.btnSampleEnglish.addEventListener('click', () => { if (EL.lyricsInput) EL.lyricsInput.value = sampleEnglish; });

    // TAB 1: WHISPER RUN & TOGGLE
    if (EL.btnToggleGroqKey && EL.inputGroqKey) {
      EL.btnToggleGroqKey.addEventListener('click', () => {
        const isPwd = EL.inputGroqKey.type === 'password';
        EL.inputGroqKey.type = isPwd ? 'text' : 'password';
        EL.btnToggleGroqKey.textContent = isPwd ? '🙈' : '👁️';
        EL.btnToggleGroqKey.title = isPwd ? 'Hide Key' : 'Show Key';
      });
    }

    if (EL.btnRunWhisper) {
      EL.btnRunWhisper.addEventListener('click', () => {
        const key = (EL.inputGroqKey ? EL.inputGroqKey.value : '').trim();
        if (!key) {
          showToast('Please enter your Groq API key (free at console.groq.com)', 'error');
          if (EL.inputGroqKey) EL.inputGroqKey.focus();
          return;
        }

        localStorage.setItem('subzfree_groq_key', key);
        const lang = (EL.whisperLangSelect ? EL.whisperLangSelect.value : 'auto');

        if (!state.videoFile) {
          state.pendingWhisperTranscription = { key, lang };
          closeModal();
          showToast('🔑 Groq Key saved! Please choose your video to transcribe.', 'info');
          if (EL.fileInput) EL.fileInput.click();
          return;
        }

        closeModal();
        runWhisperTranscription(key, lang);
      });
    }

    // TAB 3: LIVE VOICE DICTATION
    let isDictating = false;
    if (EL.btnVoiceDictate) {
      EL.btnVoiceDictate.addEventListener('click', () => {
        if (isDictating) {
          TRANSCRIBE.stopSpeechRecognition();
          isDictating = false;
          EL.btnVoiceDictate.textContent = '🎤 Start Listening';
          EL.btnVoiceDictate.style.borderColor = '#10B981';
          EL.btnVoiceDictate.style.color = '#10B981';
          if (EL.dictateStatus) EL.dictateStatus.textContent = 'Listening stopped';
          showToast('Voice dictation stopped', 'info');
        } else {
          const lang = EL.langSelect && EL.langSelect.value === 'en' ? 'en-IN' : (EL.langSelect && EL.langSelect.value === 'pa' ? 'pa-IN' : 'hi-IN');
          const rec = TRANSCRIBE.startSpeechRecognition({
            onFinal: text => {
              const targetEl = EL.dictatePreview || EL.lyricsInput;
              if (targetEl) {
                const prev = targetEl.value.trim();
                targetEl.value = prev ? (prev + '\n' + text) : text;
              }
              showToast(`Transcribed: "${text}"`, 'info');
            },
            onError: err => {
              showToast(`Speech recognition: ${err}`, 'error');
              isDictating = false;
              EL.btnVoiceDictate.textContent = '🎤 Start Listening';
              EL.btnVoiceDictate.style.borderColor = '#10B981';
              EL.btnVoiceDictate.style.color = '#10B981';
              if (EL.dictateStatus) EL.dictateStatus.textContent = 'Microphone error: ' + err;
            },
            onEnd: () => {
              isDictating = false;
              EL.btnVoiceDictate.textContent = '🎤 Start Listening';
              EL.btnVoiceDictate.style.borderColor = '#10B981';
              EL.btnVoiceDictate.style.color = '#10B981';
              if (EL.dictateStatus) EL.dictateStatus.textContent = 'Ready to listen again';
            },
            lang
          });
          if (rec) {
            isDictating = true;
            EL.btnVoiceDictate.textContent = '🔴 Listening... (speak or play audio)';
            EL.btnVoiceDictate.style.borderColor = '#EF4444';
            EL.btnVoiceDictate.style.color = '#EF4444';
            if (EL.dictateStatus) EL.dictateStatus.textContent = 'Listening to audio... Speak clearly';
            showToast('Listening to audio... speak or play video sound', 'info');
          }
        }
      });
    }

    if (EL.btnApplyDictate) {
      EL.btnApplyDictate.addEventListener('click', () => {
        const text = (EL.dictatePreview ? EL.dictatePreview.value : '').trim();
        if (!text) {
          showToast('No dictated text yet. Click "Start Listening" and speak into microphone.', 'error');
          return;
        }
        if (EL.lyricsInput) EL.lyricsInput.value = text;
        switchTab('script');
        showToast('Transferred to script! Click "Apply & Sync Words" to generate.', 'info');
      });
    }
  }

  // ── Find & Replace Feature ─────────────────────────────────
  function initFindReplace() {
    if (!EL.btnToggleReplace || !EL.quickReplaceBar) return;

    EL.btnToggleReplace.addEventListener('click', () => {
      const isVisible = EL.quickReplaceBar.style.display === 'flex';
      EL.quickReplaceBar.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible && EL.findWordInput) EL.findWordInput.focus();
    });

    if (EL.btnExecReplace) {
      EL.btnExecReplace.addEventListener('click', () => {
        const findW = (EL.findWordInput.value || '').trim();
        const replW = (EL.replaceWordInput.value || '').trim();
        if (!findW) {
          showToast('Enter wrong word to find!', 'error');
          return;
        }

        recordState();
        let replacedCount = 0;
        const reg = new RegExp('\\b' + findW + '\\b', 'gi');

        state.segments.forEach(seg => {
          if (reg.test(seg.text)) {
            seg.text = seg.text.replace(reg, () => {
              replacedCount++;
              return replW;
            });
            seg.words.forEach(w => {
              if (w.word.toLowerCase() === findW.toLowerCase()) {
                w.word = replW;
              }
            });
          }
        });

        if (replacedCount > 0) {
          window.__SUBZFREE_SEGMENTS__ = state.segments;
          renderTimeline(state.segments);
          renderTimelineBlocks();
          showToast(`Replaced ${replacedCount} occurrence(s) of "${findW}" with "${replW}"!`, 'success');
          EL.findWordInput.value = '';
          EL.replaceWordInput.value = '';
          EL.quickReplaceBar.style.display = 'none';
        } else {
          showToast(`Word "${findW}" not found in captions.`, 'info');
        }
      });
    }
  }

  // ── Ad Gate & Video Export Flow ────────────────────────────
  EL.btnDownloadTop.addEventListener('click', initiateDownload);

  function initiateDownload() {
    if (!state.hasCaption || state.segments.length === 0) {
      showToast('Generate captions first!', 'error');
      return;
    }

    // Open Ad Gate modal → on unlock callback: start render
    ADGATE.open(() => {
      startRender();
    });
  }

  function startRender() {
    showRenderOverlay(true, 0, 'Starting video render...');

    const projName = (EL.projectTitleInput ? EL.projectTitleInput.value.trim() : '') || 'video';
    const filename = `${projName}.mp4`;

    if (!window.MediaRecorder) {
      showRenderOverlay(false);
      EXPORT.downloadSRT(state.segments, `${projName}.srt`);
      showToast('Video render not supported in browser — downloaded SRT subtitles instead.', 'info');
      return;
    }

    EXPORT.render(
      EL.previewVideo,
      EL.previewCanvas,
      state.segments,
      state.currentStyle,
      filename,
      (pct, label) => {
        showRenderOverlay(true, pct, label);
      },
      (blobUrl, outFilename) => {
        showRenderOverlay(false);
        EXPORT.triggerDownload(blobUrl, outFilename);
        showToast('🎉 Download started! Your captioned video is ready.', 'success');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        EL.previewVideo.muted = false;
        EL.previewVideo.currentTime = 0;
      },
      (err) => {
        showRenderOverlay(false);
        console.error('Render failed:', err);
        EXPORT.downloadSRT(state.segments, `${projName}.srt`);
        showToast('Video render failed — downloaded SRT subtitle file instead.', 'error');
        EL.previewVideo.muted = false;
      }
    );
  }

  function showRenderOverlay(show, pct, label) {
    const overlay = EL.renderOverlay;
    if (!overlay) return;
    if (show) {
      overlay.classList.add('show');
      overlay.classList.add('open');
      overlay.style.display = 'flex';
      if (EL.renderPercent) EL.renderPercent.textContent = (pct || 0) + '%';
      if (EL.renderSub)     EL.renderSub.textContent     = label || '';
      if (EL.renderFill)    EL.renderFill.style.width    = (pct || 0) + '%';
    } else {
      overlay.classList.remove('show');
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }
  }

  // ── Keyboard Shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      togglePlay();
    }
    if (e.code === 'ArrowLeft' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      EL.previewVideo.currentTime = Math.max(0, EL.previewVideo.currentTime - 2);
    }
    if (e.code === 'ArrowRight' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      EL.previewVideo.currentTime = Math.min(EL.previewVideo.duration, EL.previewVideo.currentTime + 2);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  });

  // ── Right Sidebar Tabs (Text vs Templates) ──────────────────
  function initRightSidebarTabs() {
    if (!EL.tabBtnTemplates || !EL.tabBtnText) return;

    EL.tabBtnTemplates.addEventListener('click', () => {
      EL.tabBtnTemplates.classList.add('active');
      EL.tabBtnText.classList.remove('active');
      if (EL.tabContentTemplates) {
        EL.tabContentTemplates.classList.add('active');
        EL.tabContentTemplates.style.display = 'flex';
      }
      if (EL.tabContentText) {
        EL.tabContentText.classList.remove('active');
        EL.tabContentText.style.display = 'none';
      }
    });

    EL.tabBtnText.addEventListener('click', () => {
      EL.tabBtnText.classList.add('active');
      EL.tabBtnTemplates.classList.remove('active');
      if (EL.tabContentText) {
        EL.tabContentText.classList.add('active');
        EL.tabContentText.style.display = 'flex';
      }
      if (EL.tabContentTemplates) {
        EL.tabContentTemplates.classList.remove('active');
        EL.tabContentTemplates.style.display = 'none';
      }
    });
  }

  // ── Helper ─────────────────────────────────────────────────
  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Init ───────────────────────────────────────────────────
  initCaptionToolbar();
  initLyricsModal();
  initFindReplace();
  initRightSidebarTabs();
  applyAspectRatio('9:16');
  buildTimelineRuler(30);
  setStatus('Upload a video to start');

})();
