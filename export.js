/**
 * SubzFree - Offline WebCodecs MP4 Export Engine
 * Guarantees zero dropped frames by rendering frame-by-frame completely offline.
 */
window.EXPORT = (() => {

  const waitForSeek = (video) => new Promise((resolve) => {
    video.addEventListener('seeked', resolve, { once: true });
  });

  async function extractAudio(videoFileUrl) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const response = await fetch(videoFileUrl);
      const arrayBuffer = await response.arrayBuffer();
      return await audioCtx.decodeAudioData(arrayBuffer);
    } catch(e) {
      console.warn("Audio extraction failed", e);
      return null;
    }
  }

  async function render(video, overlayCanvas, segments, styleName, filename, onProgress, onComplete, onError) {
    try {
      onProgress(0, 'Initializing Zero-Lag MP4 Engine...');

      const duration = video.duration;
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const fps = 30;
      const totalFrames = Math.floor(duration * fps);

      // Create dedicated canvases
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w; offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      
      const captionCanvas = document.createElement('canvas');
      captionCanvas.width = w; captionCanvas.height = h;
      const captionCtx = captionCanvas.getContext('2d', { willReadFrequently: true });

      // 1. Extract Audio
      onProgress(2, 'Extracting Audio Track...');
      const videoSrc = video.querySelector('source') ? video.querySelector('source').src : video.src;
      let audioBuffer = await extractAudio(videoSrc);

      // 2. Setup MP4 Muxer
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: { codec: 'avc', width: w, height: h },
        audio: audioBuffer ? { codec: 'aac', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate } : undefined,
        fastStart: 'in-memory'
      });

      // 3. Setup Video Encoder
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => { console.error('VideoEncoder error', e); onError(e); }
      });
      videoEncoder.configure({
        codec: 'avc1.640028', // High Profile
        width: w,
        height: h,
        bitrate: 16_000_000, // 16 Mbps High Quality
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware'
      });

      // 4. Encode Audio (if exists)
      if (audioBuffer) {
        onProgress(5, 'Encoding AAC Audio...');
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: (e) => { console.error('AudioEncoder error', e); onError(e); }
        });
        audioEncoder.configure({
          codec: 'mp4a.40.2',
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          bitrate: 128_000
        });

        const sampleRate = audioBuffer.sampleRate;
        const framesPerChunk = Math.max(1, Math.floor(sampleRate / 10)); // ~100ms chunks to avoid 1024 exact frame limitations on planar extraction
        // WebCodecs AAC requires planar data 
        for (let i = 0; i < audioBuffer.length; i += framesPerChunk) {
            const numFrames = Math.min(framesPerChunk, audioBuffer.length - i);
            const data = new Float32Array(numFrames * audioBuffer.numberOfChannels);
            
            for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
                data.set(audioBuffer.getChannelData(c).subarray(i, i + numFrames), c * numFrames);
            }

            const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: numFrames,
                numberOfChannels: audioBuffer.numberOfChannels,
                timestamp: (i / sampleRate) * 1_000_000,
                data: data
            });
            audioEncoder.encode(audioData);
            audioData.close();
        }
        await audioEncoder.flush();
        audioEncoder.close();
      }

      // 5. Offline Frame Rendering Loop
      onProgress(15, 'Rendering perfect frames (0% drop rate)...');
      
      let currentFrame = 0;
      video.pause();
      
      while (currentFrame < totalFrames) {
        const ct = currentFrame / fps;
        video.currentTime = ct;
        await waitForSeek(video);
        
        // Draw Video
        offCtx.drawImage(video, 0, 0, w, h);
        
        // Draw Captions
        captionCtx.clearRect(0, 0, w, h);
        window.__SUBZFREE_SEGMENTS__ = segments;
        CAPTIONS.draw(styleName, captionCtx, captionCanvas, segments, ct);
        offCtx.drawImage(captionCanvas, 0, 0, w, h);
        
        // Create VideoFrame and Encode
        const bitmap = await createImageBitmap(offCanvas);
        const frame = new VideoFrame(bitmap, { timestamp: ct * 1_000_000 });
        videoEncoder.encode(frame, { keyFrame: currentFrame % (fps * 2) === 0 });
        frame.close();
        
        currentFrame++;
        
        // Progress UI every 5 frames
        if (currentFrame % 5 === 0) {
            const pct = 15 + Math.round((currentFrame / totalFrames) * 80);
            onProgress(pct, "Rendering perfectly: Frame $(currentFrame) / $(totalFrames)");
        }
      }
      
      onProgress(98, 'Finalizing true MP4 file...');
      await videoEncoder.flush();
      videoEncoder.close();
      muxer.finalize();
      
      const buffer = muxer.target.buffer;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      onComplete(url, filename.replace(/\.[^.]+$/, '') + '_subzfree.mp4');

    } catch (err) {
      console.error('Export error:', err);
      onError(err);
    }
  }

  return { render };
})();