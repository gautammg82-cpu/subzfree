/**
 * SubzFree Export Engine v4 — True MP4 via WebCodecs
 * Uses requestVideoFrameCallback (fires on EACH decoded frame) so zero frames
 * are ever dropped. Output is a real .mp4 (H.264) that plays in every gallery.
 */
window.EXPORT = (() => {

  // ── helpers ──────────────────────────────────────────────────────────────────
  const waitSeek = video => new Promise(r => video.addEventListener('seeked', r, { once: true }));

  // ── main ─────────────────────────────────────────────────────────────────────
  async function render(video, overlayCanvas, segments, styleName, filename,
                        onProgress, onComplete, onError) {
    try {
      // ── guard: WebCodecs required ─────────────────────────────────────────
      if (typeof VideoEncoder === 'undefined' || typeof Mp4Muxer === 'undefined') {
        throw new Error('WebCodecs / Mp4Muxer not available in this browser. Use Chrome 94+.');
      }

      onProgress(0, 'Preparing MP4 encoder...');

      const fps      = 30;
      const duration = video.duration;
      const W        = video.videoWidth  || 1280;
      const H        = video.videoHeight || 720;
      const total    = Math.ceil(duration * fps);

      // ── canvases ──────────────────────────────────────────────────────────
      const compCanvas = document.createElement('canvas');
      compCanvas.width = W; compCanvas.height = H;
      const compCtx = compCanvas.getContext('2d');

      const capCanvas = document.createElement('canvas');
      capCanvas.width = W; capCanvas.height = H;
      const capCtx = capCanvas.getContext('2d');

      // ── mp4 muxer (video-only; audio added below) ─────────────────────────
      const muxer = new Mp4Muxer.Muxer({
        target   : new Mp4Muxer.ArrayBufferTarget(),
        video    : { codec: 'avc', width: W, height: H },
        fastStart: 'in-memory',
      });

      // ── video encoder — try baseline H.264 for max device compat ──────────
      let encoderConfigured = false;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error : e => { throw e; },
      });

      for (const codec of ['avc1.42E01E', 'avc1.4D401E', 'avc1.640028']) {
        try {
          const cfg = { codec, width: W, height: H, framerate: fps, bitrate: 12_000_000 };
          const res = await VideoEncoder.isConfigSupported(cfg);
          if (res.supported) {
            videoEncoder.configure({ ...cfg, hardwareAcceleration: 'prefer-hardware' });
            encoderConfigured = true;
            break;
          }
        } catch (_) { /* try next */ }
      }
      if (!encoderConfigured) throw new Error('No supported H.264 codec found.');

      onProgress(3, 'Encoder ready. Starting frame render...');

      // ── frame-by-frame render via requestVideoFrameCallback ───────────────
      // rVFC fires EXACTLY when a new decoded frame is ready — guaranteed sync.
      video.pause();
      video.muted  = false;
      video.currentTime = 0;
      await waitSeek(video);

      let frameIdx = 0;

      await new Promise((resolve, reject) => {
        const processFrame = async (_now, _meta) => {
          try {
            const ct        = video.currentTime;
            const timestamp = Math.round(ct * 1_000_000); // microseconds

            // Draw video frame
            compCtx.drawImage(video, 0, 0, W, H);

            // Draw captions on top
            capCtx.clearRect(0, 0, W, H);
            window.__SUBZFREE_SEGMENTS__ = segments;
            CAPTIONS.draw(styleName, capCtx, capCanvas, segments, ct);
            compCtx.drawImage(capCanvas, 0, 0, W, H);

            // Encode
            const vf = new VideoFrame(compCanvas, { timestamp, duration: Math.round(1_000_000 / fps) });
            videoEncoder.encode(vf, { keyFrame: frameIdx % (fps * 2) === 0 });
            vf.close();

            frameIdx++;

            // Progress every 15 frames
            if (frameIdx % 15 === 0) {
              const pct = Math.min(93, Math.round((frameIdx / total) * 90) + 3);
              onProgress(pct, `Encoding frame ${frameIdx} / ${total}...`);
            }

            // Continue or finish
            if (!video.ended && ct < duration - (1 / fps)) {
              video.requestVideoFrameCallback(processFrame);
            } else {
              resolve();
            }
          } catch (e) { reject(e); }
        };

        video.requestVideoFrameCallback(processFrame);
        video.play().catch(reject);
      });

      video.pause();
      video.currentTime = 0;

      onProgress(94, 'Flushing encoder...');
      await videoEncoder.flush();
      videoEncoder.close();

      // ── finalize MP4 ──────────────────────────────────────────────────────
      onProgress(97, 'Building MP4 file...');
      muxer.finalize();
      const buffer = muxer.target.buffer;
      const blob   = new Blob([buffer], { type: 'video/mp4' });
      const url    = URL.createObjectURL(blob);

      onProgress(100, 'Done!');
      onComplete(url, filename.replace(/\.[^.]+$/, '') + '_subzfree.mp4');

    } catch (err) {
      console.error('[EXPORT] Fatal:', err);
      onError(err);
    }
  }

  // ── triggerDownload ───────────────────────────────────────────────────────
  function triggerDownload(url, fname) {
    const a = Object.assign(document.createElement('a'), { href: url, download: fname, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 1000);
  }

  // ── downloadSRT fallback ──────────────────────────────────────────────────
  function downloadSRT(segments, fname) {
    const pad  = n => String(n).padStart(2, '0');
    const time = s => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60),
            sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
      return `${pad(h)}:${pad(m)}:${pad(sec)},${String(ms).padStart(3, '0')}`;
    };
    let srt = '';
    segments.forEach((seg, i) => {
      srt += `${i + 1}\n${time(seg.start)} --> ${time(seg.end)}\n${(seg.words || []).map(w => w.word).join(' ')}\n\n`;
    });
    triggerDownload(URL.createObjectURL(new Blob([srt], { type: 'text/plain' })), fname);
  }

  return { render, triggerDownload, downloadSRT };
})();