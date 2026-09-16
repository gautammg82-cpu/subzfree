/**
 * SubzFree — Video Export Engine
 * Renders captions onto video frames using Canvas + MediaRecorder API.
 * No external libraries needed — runs entirely in the browser.
 */

const EXPORT = (() => {

  /**
   * Render captioned video and trigger download.
   *
   * @param {HTMLVideoElement} video     - Source video element
   * @param {HTMLCanvasElement} canvas   - Overlay canvas with captions
   * @param {Array}  segments            - Caption segments
   * @param {string} styleName           - Selected caption style
   * @param {string} filename            - Output filename
   * @param {Function} onProgress        - Called with (percent, label)
   * @param {Function} onComplete        - Called when done with blob URL
   * @param {Function} onError           - Called on error
   */
  async function render(video, overlayCanvas, segments, styleName, filename, onProgress, onComplete, onError) {
    try {
      onProgress(0, 'Setting up render...');

      const duration = video.duration;
      const w = video.videoWidth  || 1280;
      const h = video.videoHeight || 720;

      // Create offscreen canvas for compositing video + captions
      const offCanvas = document.createElement('canvas');
      offCanvas.width  = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d');

      // Dedicated transparent canvas for captions to prevent clearRect from erasing video!
      const captionCanvas = document.createElement('canvas');
      captionCanvas.width  = w;
      captionCanvas.height = h;
      const captionCtx = captionCanvas.getContext('2d');

      // Try to capture video stream + set up MediaRecorder
      let recorder, chunks = [];
      let mimeType = 'video/mp4;codecs=avc1';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const stream = offCanvas.captureStream(30);

      // Try to add audio track
      try {
        if (video.captureStream) {
          const vStream = video.captureStream();
          vStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
      } catch (e) {
        console.warn('No audio track captured:', e);
      }

      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 15_000_000,
      });

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        onComplete(url, filename.replace(/\.[^.]+$/, '') + '_subzfree.webm');
      };

      onProgress(5, 'Starting render...');

      // Seek to start and play
      video.currentTime = 0;
      await waitForSeek(video);

      recorder.start(100); // collect data every 100ms
      video.muted = true;
      video.play();

      const fps    = 30;
      const frameMs = 1000 / fps;
      let   lastPct = 0;

      let isRendering = true;

      // The core drawing logic for a single frame
      function drawFrame() {
        const ct  = video.currentTime;
        const pct = Math.min(95, Math.round((ct / duration) * 90) + 5);

        if (pct !== lastPct) {
          lastPct = pct;
          onProgress(pct, `Rendering frame ${Math.round(ct)}s / ${Math.round(duration)}s`);
        }

        // 1. Draw video frame onto offCanvas
        offCtx.drawImage(video, 0, 0, w, h);

        // 2. Clear transparent caption layer
        captionCtx.clearRect(0, 0, w, h);

        // 3. Draw captions onto transparent layer
        window.__SUBZFREE_SEGMENTS__ = segments;
        CAPTIONS.draw(styleName, captionCtx, captionCanvas, segments, ct);

        // 4. Composite transparent captions cleanly on top of video frame
        offCtx.drawImage(captionCanvas, 0, 0, w, h);

        // If video ended
        if (video.ended || ct >= duration - 0.05) {
          isRendering = false;
          video.pause();
          recorder.stop();
          onProgress(100, 'Finalizing...');
        }
      }

      // 100% Perfectly synced loop (Only draws when a NEW video frame is ready)
      function renderLoopVFC(now, metadata) {
        if (!isRendering) return;
        drawFrame();
        if (isRendering && 'requestVideoFrameCallback' in video) {
          video.requestVideoFrameCallback(renderLoopVFC);
        }
      }

      // Fallback loop (Draws at monitor refresh rate, e.g. 60fps)
      function renderLoopRAF() {
        if (!isRendering) return;
        requestAnimationFrame(renderLoopRAF);
        drawFrame();
      }

      // Start the smartest possible render loop
      if ('requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(renderLoopVFC);
      } else {
        requestAnimationFrame(renderLoopRAF);
      }

    } catch (err) {
      console.error('Export error:', err);
      onError(err);
    }
  }

  function waitForSeek(video) {
    return new Promise(resolve => {
      if (Math.abs(video.currentTime) < 0.1) { resolve(); return; }
      video.onseeked = () => { video.onseeked = null; resolve(); };
    });
  }

  /**
   * Fallback: download as SRT subtitle file
   */
  function downloadSRT(segments, filename) {
    let srt = '';
    segments.forEach((seg, i) => {
      const start = formatSRTTime(seg.start);
      const end   = formatSRTTime(seg.end);
      srt += `${i + 1}\n${start} --> ${end}\n${seg.text}\n\n`;
    });

    const blob = new Blob([srt], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    triggerDownload(url, filename.replace(/\.[^.]+$/, '') + '_subzfree.srt');
    URL.revokeObjectURL(url);
  }

  function formatSRTTime(secs) {
    const h   = Math.floor(secs / 3600);
    const m   = Math.floor((secs % 3600) / 60);
    const s   = Math.floor(secs % 60);
    const ms  = Math.round((secs % 1) * 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)},${ms.toString().padStart(3,'0')}`;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { render, downloadSRT, triggerDownload };
})();
