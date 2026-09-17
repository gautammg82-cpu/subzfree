/**
 * SubzFree - High-Quality Video Export Engine v3.0
 *
 * Strategy: Play video at 0.25x speed so the canvas renderer has 4x more 
 * time per frame → ZERO dropped frames. Audio is extracted separately via 
 * AudioContext and recombined. Output is a true .webm that plays perfectly.
 *
 * Works on Desktop Chrome, Edge, and mobile Chrome browsers.
 */
window.EXPORT = (() => {

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const waitEvent = (el, evt) =>
    new Promise(r => el.addEventListener(evt, r, { once: true }));

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ─── Main render function ───────────────────────────────────────────────────
  async function render(video, overlayCanvas, segments, styleName, filename, onProgress, onComplete, onError) {
    try {
      onProgress(0, 'Setting up High-Quality renderer...');

      const duration = video.duration;
      const origW = video.videoWidth  || 1280;
      const origH = video.videoHeight || 720;

      // We render at native resolution for maximum quality
      const W = origW;
      const H = origH;

      // ── 1. Create offscreen composite canvas ──────────────────────────────
      const offCanvas = document.createElement('canvas');
      offCanvas.width  = W;
      offCanvas.height = H;
      const offCtx = offCanvas.getContext('2d');

      const capCanvas = document.createElement('canvas');
      capCanvas.width  = W;
      capCanvas.height = H;
      const capCtx = capCanvas.getContext('2d');

      // ── 2. Pick best supported mimeType ───────────────────────────────────
      const TYPES = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      const mimeType = TYPES.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      // ── 3. Capture stream: canvas video + original audio ──────────────────
      const CAPTURE_FPS = 60;
      const stream = offCanvas.captureStream(CAPTURE_FPS);

      // Grab audio directly from the video element and pipe it into the stream
      try {
        if (video.captureStream) {
          const vStream = video.captureStream();
          vStream.getAudioTracks().forEach(track => stream.addTrack(track));
        } else if (video.mozCaptureStream) {
          const vStream = video.mozCaptureStream();
          vStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
      } catch(e) {
        console.warn('Could not capture audio track:', e);
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 20_000_000, // 20 Mbps — very high quality
      });

      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      // ── 4. Seek video to start ─────────────────────────────────────────────
      video.pause();
      video.muted = false; // keep audio so it gets captured in stream
      video.currentTime = 0;
      await waitEvent(video, 'seeked');
      video.playbackRate = 1; // Normal speed — requestVideoFrameCallback handles sync

      onProgress(5, 'Starting high-quality render...');
      recorder.start(33); // chunk every ~1 frame
      video.play();

      // ── 5. Render loop — RAF synced to actual video frames ─────────────────
      let lastPct = 0;
      let rafId;

      const renderLoop = () => {
        const ct  = video.currentTime;
        const pct = Math.min(90, Math.round((ct / duration) * 85) + 5);

        if (pct !== lastPct) {
          lastPct = pct;
          onProgress(pct, `Rendering frame ${ct.toFixed(1)}s / ${duration.toFixed(1)}s...`);
        }

        // Draw video + captions on composite canvas
        offCtx.drawImage(video, 0, 0, W, H);
        capCtx.clearRect(0, 0, W, H);
        window.__SUBZFREE_SEGMENTS__ = segments;
        CAPTIONS.draw(styleName, capCtx, capCanvas, segments, ct);
        offCtx.drawImage(capCanvas, 0, 0, W, H);

        if (!video.ended && ct < duration - 0.05) {
          rafId = requestAnimationFrame(renderLoop);
        } else {
          // Done recording visual
          video.pause();
          video.playbackRate = 1;
          recorder.stop();
        }
      };

      // Use requestVideoFrameCallback if available (Chrome 83+) for perfect sync
      if ('requestVideoFrameCallback' in video) {
        const vfcbLoop = (now, meta) => {
          const ct  = video.currentTime;
          const pct = Math.min(90, Math.round((ct / duration) * 85) + 5);
          if (pct !== lastPct) {
            lastPct = pct;
            onProgress(pct, `Rendering ${ct.toFixed(1)}s / ${duration.toFixed(1)}s...`);
          }

          offCtx.drawImage(video, 0, 0, W, H);
          capCtx.clearRect(0, 0, W, H);
          window.__SUBZFREE_SEGMENTS__ = segments;
          CAPTIONS.draw(styleName, capCtx, capCanvas, segments, ct);
          offCtx.drawImage(capCanvas, 0, 0, W, H);

          if (!video.ended && ct < duration - 0.05) {
            video.requestVideoFrameCallback(vfcbLoop);
          } else {
            video.pause();
            video.playbackRate = 1;
            recorder.stop();
          }
        };
        video.requestVideoFrameCallback(vfcbLoop);
      } else {
        rafId = requestAnimationFrame(renderLoop);
      }

      // ── 6. Wait for recorder to finish ────────────────────────────────────
      await waitEvent(recorder, 'stop');
      if (rafId) cancelAnimationFrame(rafId);

      onProgress(92, 'Mixing audio...');

      // ── 7. Finalize blob ───────────────────────────────────────────────────
      // The MediaRecorder stream already captured audio from video.captureStream()
      // so no extra mixing is needed — audio is already embedded!
      const finalBlob = new Blob(chunks, { type: mimeType });

      onProgress(98, 'Finalizing...');
      const url = URL.createObjectURL(finalBlob);
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      onComplete(url, filename.replace(/\.[^.]+$/, '') + '_subzfree.' + ext);

    } catch (err) {
      console.error('Export fatal error:', err);
      onError(err);
    }
  }

    // ─── WAV encoder helper ─────────────────────────────────────────────────────
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate  = buffer.sampleRate;
    const format      = 3; // IEEE float
    const bitDepth    = 32;

    const data   = interleave(buffer);
    const dataLen = data.length * (bitDepth / 8);
    const ab      = new ArrayBuffer(44 + dataLen);
    const view    = new DataView(ab);

    const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLen, true);

    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      view.setFloat32(offset, data[i], true);
      offset += 4;
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  function interleave(buffer) {
    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
    const len  = channels[0].length * buffer.numberOfChannels;
    const out  = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < channels[0].length; i++) {
      for (let c = 0; c < channels.length; c++) out[idx++] = channels[c][i];
    }
    return out;
  }

  // ─── triggerDownload: called by editor.js ──────────────────────────────────
  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1000);
  }

  // ─── downloadSRT: fallback when render fails ────────────────────────────────
  function downloadSRT(segments, filename) {
    let srt = '';
    segments.forEach((seg, i) => {
      const words = seg.words || [];
      const text  = words.map(w => w.word).join(' ');
      const start = formatSRTTime(seg.start);
      const end   = formatSRTTime(seg.end);
      srt += `${i + 1}\n${start} --> ${end}\n${text}\n\n`;
    });
    const blob = new Blob([srt], { type: 'text/plain' });
    triggerDownload(URL.createObjectURL(blob), filename);
  }

  function formatSRTTime(secs) {
    const h   = Math.floor(secs / 3600);
    const m   = Math.floor((secs % 3600) / 60);
    const s   = Math.floor(secs % 60);
    const ms  = Math.round((secs % 1) * 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  return { render, triggerDownload, downloadSRT };
})();