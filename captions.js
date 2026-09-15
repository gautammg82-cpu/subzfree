/**
 * SubzFree — Caption Style Renderers
 * 30+ animated styles drawn on Canvas.
 *
 * Each style function signature:
 *   drawStyle(ctx, canvas, words, currentTime, options)
 *   - ctx         : CanvasRenderingContext2D
 *   - canvas      : HTMLCanvasElement
 *   - words       : Array<{word, start, end}>
 *   - currentTime : video currentTime in seconds
 *   - options     : { fontSize, positionY, primaryColor, bgColor }
 */

const CAPTIONS = (() => {

  // ── Shared helpers ──────────────────────────────────────────

  function getActiveWords(words, currentTime) {
    return words.filter(w => currentTime >= w.start && currentTime <= w.end + 0.05);
  }

  function getPassedWords(words, currentTime) {
    return words.filter(w => currentTime > w.end);
  }

  function getActiveSegment(segments, currentTime) {
    return segments.find(s => currentTime >= s.start && currentTime <= s.end + 0.08) || null;
  }

  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

  function wordProgress(word, currentTime) {
    if (currentTime < word.start) return 0;
    if (currentTime > word.end)   return 1;
    return (currentTime - word.start) / (word.end - word.start);
  }

  /**
   * Splits words into lines that fit within maxWidth.
   */
  function wrapWords(ctx, words, maxWidth, font) {
    ctx.font = font;
    const lines = [];
    let line   = [];
    let lineW  = 0;

    words.forEach(w => {
      const ww = ctx.measureText(w.word + ' ').width;
      if (lineW + ww > maxWidth && line.length) {
        lines.push(line);
        line  = [w];
        lineW = ww;
      } else {
        line.push(w);
        lineW += ww;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  }

  function clearCanvas(ctx, canvas) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  const BASE = {
    fontSize:   Math.max(20, Math.min(window.innerHeight * 0.055, 36)),
    positionY:  0.82, // fraction of canvas height
    maxWidth:   0.88, // fraction of canvas width
  };

  // ── Style Renderers ─────────────────────────────────────────

  /**
   * 1. Hormozi — bold yellow highlight box on active word
   */
  function hormozi(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs  = canvas.height * 0.062;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;

    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word).join(' ');
      ctx.font = font;
      const lineW = ctx.measureText(lineStr).width;
      let x = (canvas.width - lineW) / 2;
      const y = baseY;

      lineWords.forEach((w, i) => {
        const wText = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW    = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        if (active) {
          const pad = fs * 0.15;
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.roundRect(x - pad, y - fs * 0.9, wW + pad * 2, fs * 1.1, 4);
          ctx.fill();
          ctx.fillStyle = '#000';
        } else {
          ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur  = 6;
        }

        ctx.font = font;
        ctx.fillText(wText, x, y);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 2. Word Pop — scale up active word
   */
  function wordPop(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs  = canvas.height * 0.055;
    const font = `800 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;

    const maxW  = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.4;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word).join(' ');
      const lineW   = ctx.measureText(lineStr + ' '.repeat(lineWords.length - 1)).width;
      let x = (canvas.width - lineW) / 2;
      const y = baseY;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const active = t >= w.start && t <= w.end + 0.05;
        const prog   = wordProgress(w, t);
        const scale  = active ? lerp(1, 1.35, Math.sin(prog * Math.PI)) : 1;
        const color  = active ? '#A78BFA' : 'rgba(255,255,255,0.75)';
        const scaledFs = fs * scale;

        ctx.save();
        const wW = ctx.measureText(wText).width;
        ctx.translate(x + wW / 2, y - fs * 0.3);
        ctx.scale(scale, scale);
        ctx.font      = `800 ${fs}px 'Inter', sans-serif`;
        ctx.fillStyle = color;
        ctx.shadowColor = active ? 'rgba(167,139,250,0.6)' : 'rgba(0,0,0,0.7)';
        ctx.shadowBlur  = active ? 12 : 4;
        ctx.fillText(wText, -wW / 2, 0);
        ctx.restore();

        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 3. Bubble — rounded pill background per word
   */
  function bubble(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.052;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.6;
    let baseY   = canvas.height * 0.78 - (lines.length - 1) * lh * 0.5;
    const padH  = fs * 0.22, padV = fs * 0.16;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length - 1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.fillStyle = active
          ? 'rgba(139,92,246,0.95)'
          : 'rgba(0,0,0,0.55)';

        const bx = x - padH;
        const by = baseY - fs * 0.85 - padV;
        const bw = wW + padH * 2;
        const bh = fs + padV * 2;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, bh / 2);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();

        if (active) {
          ctx.shadowColor = 'rgba(139,92,246,0.7)';
          ctx.shadowBlur  = 14;
          ctx.fill();
          ctx.shadowBlur  = 0;
        }

        ctx.fillStyle = '#fff';
        ctx.font = font;
        ctx.fillText(wText, x, baseY);
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 4. Karaoke — words light up left-to-right, past=dim, active=bright
   */
  function karaoke(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.058;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    // black bg strip
    const stripH = (lines.length) * lh + fs * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, baseY - fs - 8, canvas.width, stripH);

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const done   = t > w.end + 0.05;
        const active = t >= w.start && t <= w.end + 0.05;
        const prog   = wordProgress(w, t);

        if (done) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
        } else if (active) {
          // gradient fill based on progress
          const grad = ctx.createLinearGradient(x, 0, x + wW, 0);
          grad.addColorStop(0,    '#FF6B35');
          grad.addColorStop(prog, '#FF6B35');
          grad.addColorStop(prog, 'rgba(255,255,255,0.3)');
          grad.addColorStop(1,    'rgba(255,255,255,0.3)');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
        }

        ctx.font = font;
        ctx.fillText(wText, x, baseY);
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 5. Neon — bright neon glow text
   */
  function neon(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.058;
    const font = `700 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;
        const color  = active ? '#39FF14' : 'rgba(57,255,20,0.4)';
        const blur   = active ? 16 : 4;

        ctx.shadowColor = color;
        ctx.shadowBlur  = blur;
        ctx.fillStyle   = color;
        ctx.font = font;
        // draw multiple times for glow
        for (let g = 0; g < (active ? 3 : 1); g++) {
          ctx.fillText(wText, x, baseY);
        }
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 6. Fire — gradient orange→red active word
   */
  function fire(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.062;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.3;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        if (active) {
          const grad = ctx.createLinearGradient(x, baseY - fs, x, baseY);
          grad.addColorStop(0,   '#FFD700');
          grad.addColorStop(0.4, '#FF6B35');
          grad.addColorStop(1,   '#FF0000');
          ctx.fillStyle   = grad;
          ctx.shadowColor = '#FF4500';
          ctx.shadowBlur  = 18;
        } else {
          ctx.fillStyle   = 'rgba(255,255,255,0.75)';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur  = 5;
        }

        ctx.font = font;
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 7. Glitch — RGB split on active word
   */
  function glitch(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.058;
    const font = `700 ${fs}px 'Space Grotesk', monospace`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;
        const offset = active ? Math.sin(t * 30) * 3 : 0;

        ctx.font = font;

        if (active) {
          ctx.fillStyle = 'rgba(0,255,255,0.8)';
          ctx.fillText(wText, x - 3 + offset, baseY);
          ctx.fillStyle = 'rgba(255,0,255,0.8)';
          ctx.fillText(wText, x + 3 - offset, baseY);
          ctx.fillStyle = '#fff';
          ctx.fillText(wText, x, baseY);
        } else {
          ctx.fillStyle = 'rgba(0,255,255,0.5)';
          ctx.fillText(wText, x, baseY);
        }
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 8. Prism — rainbow gradient text (rotates per word)
   */
  function prism(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.058;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;
    const colors = ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#8B00FF'];

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        if (active) {
          const grad = ctx.createLinearGradient(x, 0, x + wW, 0);
          colors.forEach((c, ci) => grad.addColorStop(ci / (colors.length - 1), c));
          ctx.fillStyle   = grad;
          ctx.shadowColor = 'rgba(255,255,255,0.5)';
          ctx.shadowBlur  = 8;
        } else {
          ctx.fillStyle   = 'rgba(255,255,255,0.55)';
          ctx.shadowBlur  = 0;
        }

        ctx.font = font;
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 9. Deep Glow — white text, intense purple glow on active
   */
  function deepGlow(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.058;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        if (active) {
          ctx.shadowColor = '#8B5CF6';
          ctx.shadowBlur  = 25;
          ctx.fillStyle   = '#fff';
          for (let g = 0; g < 3; g++) ctx.fillText(wText, x, baseY);
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur  = 4;
          ctx.fillStyle   = 'rgba(255,255,255,0.65)';
          ctx.fillText(wText, x, baseY);
        }
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 10. MrBeast — thick outline chunky text
   */
  function mrbeast(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.065;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.3;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word.toUpperCase() + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        // stroke
        ctx.strokeStyle = '#000';
        ctx.lineWidth   = fs * 0.12;
        ctx.lineJoin    = 'round';
        ctx.strokeText(wText, x, baseY);
        // fill
        ctx.fillStyle = active ? '#FFD700' : '#FFFFFF';
        ctx.fillText(wText, x, baseY);
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 11. Highlighted — marker highlight behind active word
   */
  function highlighted(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.055;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.4;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        if (active) {
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(x - 2, baseY - fs * 0.85, wW + 4, fs * 1.05);
          ctx.fillStyle = '#000';
        } else {
          ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur  = 5;
        }
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 12. Classic — white with drop shadow
   */
  function classic(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.055;
    const font = `600 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.4;
    let baseY   = canvas.height * 0.82 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word).join(' ');
      const lineW   = ctx.measureText(lineStr).width;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur  = 8;
      ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#fff';
      ctx.font = font;
      ctx.fillText(lineStr, (canvas.width - lineW) / 2, baseY);
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      baseY += lh;
    });
  }

  /**
   * 13. Cinematic — spaced uppercase
   */
  function cinematic(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.042;
    const font = `600 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    ctx.letterSpacing = '0.25em';
    const maxW = canvas.width * 0.75;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.5;
    let baseY   = canvas.height * 0.82 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word.toUpperCase()).join('  ');
      const lineW   = ctx.measureText(lineStr).width;
      ctx.fillStyle   = 'rgba(229,231,235,0.92)';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur  = 10;
      ctx.font = font;
      ctx.fillText(lineStr, (canvas.width - lineW) / 2, baseY);
      ctx.shadowBlur = 0;
      baseY += lh;
    });
    ctx.letterSpacing = '0';
  }

  /**
   * 14. Matrix — green on black
   */
  function matrix(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.055;
    const font = `700 ${fs}px monospace`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.4;
    const stripH = lines.length * lh + fs * 0.5;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, baseY - fs - 10, canvas.width, stripH);

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        ctx.shadowColor = '#00FF41';
        ctx.shadowBlur  = active ? 12 : 4;
        ctx.fillStyle   = active ? '#00FF41' : 'rgba(0,255,65,0.45)';
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 15. Gold — metallic gold gradient text
   */
  function gold(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.062;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.3;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        const grad = ctx.createLinearGradient(x, baseY - fs, x, baseY);
        if (active) {
          grad.addColorStop(0,   '#FFF8DC');
          grad.addColorStop(0.3, '#FFD700');
          grad.addColorStop(0.7, '#BF953F');
          grad.addColorStop(1,   '#FCF6BA');
        } else {
          grad.addColorStop(0, 'rgba(191,149,63,0.6)');
          grad.addColorStop(1, 'rgba(191,149,63,0.4)');
        }

        ctx.font = font;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth   = 2;
        ctx.strokeText(wText, x, baseY);
        ctx.fillStyle = grad;
        ctx.fillText(wText, x, baseY);
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 16. Ice — blue crystalline glow
   */
  function ice(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.058;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        ctx.shadowColor = active ? '#38BDF8' : 'rgba(56,189,248,0.3)';
        ctx.shadowBlur  = active ? 20 : 4;
        ctx.fillStyle   = active ? '#BAE6FD' : 'rgba(186,230,253,0.45)';
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 17. Minimal — thin, elegant
   */
  function minimal(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.05;
    const font = `300 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.7;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.5;
    let baseY   = canvas.height * 0.83 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word).join(' ');
      const lineW   = ctx.measureText(lineStr).width;
      ctx.fillStyle   = 'rgba(255,255,255,0.88)';
      ctx.font = font;
      ctx.fillText(lineStr, (canvas.width - lineW) / 2, baseY);
      baseY += lh;
    });
  }

  /**
   * 18. Podcast — rounded box, clean
   */
  function podcast(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.052;
    const font = `600 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.78;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.5;
    const pad   = fs * 0.7;
    const totalH = lines.length * lh + pad * 2 - lh * 0.35;
    const bh    = totalH;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    // Measure block width
    let maxLW = 0;
    lines.forEach(lw => {
      const w = ctx.measureText(lw.map(w => w.word).join(' ')).width;
      if (w > maxLW) maxLW = w;
    });

    const bx = (canvas.width - maxLW) / 2 - pad;
    const by = baseY - fs * 0.9 - pad;
    const bw = maxLW + pad * 2;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 12);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word).join(' ');
      const lineW   = ctx.measureText(lineStr).width;
      ctx.fillStyle   = '#fff';
      ctx.font = font;
      ctx.fillText(lineStr, (canvas.width - lineW) / 2, baseY);
      baseY += lh;
    });
  }

  /**
   * 19. Street — graffiti, saffron glow
   */
  function street(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.065;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.3;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word.toUpperCase() + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word.toUpperCase() + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        ctx.strokeStyle = '#1A0A00';
        ctx.lineWidth   = fs * 0.1;
        ctx.strokeText(wText, x, baseY);
        ctx.fillStyle   = active ? '#FF6B35' : 'rgba(255,107,53,0.55)';
        ctx.shadowColor = active ? '#FF4500' : 'transparent';
        ctx.shadowBlur  = active ? 16 : 0;
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  /**
   * 20. News Ticker — red bar bottom
   */
  function newsTicker(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const barH = canvas.height * 0.1;
    const by   = canvas.height - barH;

    ctx.fillStyle = '#CC0000';
    ctx.fillRect(0, by, canvas.width, barH);

    const fs   = barH * 0.52;
    const font = `800 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;

    const text  = seg.words.map(w => w.word.toUpperCase()).join('  ');
    const textW = ctx.measureText(text).width;
    const tx    = (canvas.width - textW) / 2;

    ctx.fillStyle = '#fff';
    ctx.fillText(text, tx, by + barH * 0.68);
  }

  /**
   * 21. DELHI (Spotlight Aura)
   * As in reference screenshot:
   * Dark background. Context words in bold white sans.
   * Active word in elegant slanted italic serif with a soft circular radial spotlight aura glow behind it.
   */
  function delhi(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.066;
    const normFont = `700 ${fs}px 'Inter', 'Space Grotesk', sans-serif`;
    const activeFont = `italic 700 ${fs * 1.08}px 'Playfair Display', 'Caveat', serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.77;

    const gap = canvas.width * 0.022;

    const items = seg.words.map((w, idx) => {
      const isAct = idx === ai;
      ctx.font = isAct ? activeFont : normFont;
      const text = w.word;
      const tw = ctx.measureText(text).width;
      return { text, tw, isAct };
    });

    const totalW = items.reduce((acc, it) => acc + it.tw, 0) + (items.length - 1) * gap;
    let x = cx - totalW / 2;

    items.forEach(it => {
      if (it.isAct) {
        const wordCx = x + it.tw / 2;
        const wordCy = baseY - fs * 0.35;
        const auraR = it.tw * 1.1 + fs * 0.8;

        const auraG = ctx.createRadialGradient(wordCx, wordCy, 2, wordCx, wordCy, auraR);
        auraG.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        auraG.addColorStop(0.35, 'rgba(210, 235, 255, 0.22)');
        auraG.addColorStop(0.7, 'rgba(160, 200, 255, 0.08)');
        auraG.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = auraG;
        ctx.beginPath();
        ctx.arc(wordCx, wordCy, auraR, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = activeFont;
        ctx.fillStyle = 'rgba(0, 200, 255, 0.35)';
        ctx.fillText(it.text, x - 1, baseY);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fillText(it.text, x, baseY);
        ctx.shadowBlur = 0;
      } else {
        ctx.font = normFont;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(it.text, x, baseY);
        ctx.shadowBlur = 0;
      }
      x += it.tw + gap;
    });
  }

  /**
   * 22. Word Reveal — dim all, only active is bright
   */
  function wordReveal(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.055;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;
    const maxW = canvas.width * 0.86;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.35;
    let baseY   = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineW = lineWords.reduce((a, w, i) => a + ctx.measureText(w.word + (i < lineWords.length-1 ? ' ' : '')).width, 0);
      let x = (canvas.width - lineW) / 2;

      lineWords.forEach((w, i) => {
        const wText  = w.word + (i < lineWords.length - 1 ? ' ' : '');
        const wW     = ctx.measureText(wText).width;
        const active = t >= w.start && t <= w.end + 0.05;

        ctx.font = font;
        ctx.fillStyle   = active ? '#fff' : 'rgba(255,255,255,0.18)';
        ctx.shadowColor = active ? 'rgba(139,92,246,0.8)' : 'transparent';
        ctx.shadowBlur  = active ? 12 : 0;
        ctx.fillText(wText, x, baseY);
        ctx.shadowBlur = 0;
        x += wW;
      });
      baseY += lh;
    });
  }

  // Simple wrappers for remaining styles that share logic
  function liquid_glass(ctx, canvas, words, t) { podcast(ctx, canvas, words, t); }
  function gradient_pop(ctx, canvas, words, t) { fire(ctx, canvas, words, t); }
  function shadow_drop(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;
    const fs   = canvas.height * 0.058;
    const font = `800 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;
    const lines = wrapWords(ctx, seg.words, canvas.width * 0.86, font);
    const lh = fs * 1.35;
    let baseY = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;
    lines.forEach(lw => {
      const s = lw.map(w => w.word).join(' ');
      const w = ctx.measureText(s).width;
      ctx.shadowColor = 'rgba(139,92,246,0.9)';
      ctx.shadowBlur  = 0; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#fff';
      ctx.font = font;
      ctx.fillText(s, (canvas.width - w)/2, baseY);
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      baseY += lh;
    });
  }
  function outline(ctx, canvas, words, t) { mrbeast(ctx, canvas, words, t); }
  function comic(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;
    const fs = canvas.height * 0.062;
    const font = `900 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font = font;
    const lines = wrapWords(ctx, seg.words, canvas.width * 0.86, font);
    const lh = fs * 1.3;
    let baseY = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;
    lines.forEach(lw => {
      const lineW = lw.reduce((a, w, i) => a + ctx.measureText(w.word + (i<lw.length-1?' ':'')).width, 0);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect((canvas.width - lineW)/2 - 8, baseY - fs - 6, lineW + 16, fs + 12);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.strokeRect((canvas.width - lineW)/2 - 8, baseY - fs - 6, lineW + 16, fs + 12);
      ctx.fillStyle = '#000'; ctx.font = font;
      ctx.fillText(lw.map(w => w.word).join(' '), (canvas.width - lineW)/2, baseY);
      baseY += lh;
    });
  }
  function retro(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;
    const fs = canvas.height * 0.052;
    const font = `700 ${fs}px monospace`;
    ctx.font = font;
    const lines = wrapWords(ctx, seg.words, canvas.width * 0.86, font);
    const lh = fs * 1.4;
    let baseY = canvas.height * 0.8 - (lines.length - 1) * lh * 0.5;
    lines.forEach(lw => {
      const s = lw.map(w => w.word).join(' ');
      const lineW = ctx.measureText(s).width;
      ctx.fillStyle = 'rgba(42,26,10,0.85)';
      ctx.fillRect((canvas.width-lineW)/2-8, baseY-fs-4, lineW+16, fs+8);
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2;
      ctx.strokeRect((canvas.width-lineW)/2-8, baseY-fs-4, lineW+16, fs+8);
      ctx.fillStyle = '#FFB347'; ctx.font = font;
      ctx.fillText(s, (canvas.width-lineW)/2, baseY);
      baseY += lh;
    });
  }
  function bounce(ctx, canvas, words, t) { wordPop(ctx, canvas, words, t); }
  function typewriter(ctx, canvas, words, t) { karaoke(ctx, canvas, words, t); }

  // ════════════════════════════════════════════════════════════
  // USER-REQUESTED STYLES
  // ════════════════════════════════════════════════════════════

  /**
   * BIG REVEAL
   * Active word shown HUGE and yellow/bold in center.
   * Rest of the segment words shown small + white below it.
   * Like: "HELLO" big yellow, then "guys." small white beneath.
   */
  function bigReveal(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    // Find the active word in this segment
    const activeWordObj = seg.words.find(w => t >= w.start && t <= w.end + 0.05)
                        || seg.words[seg.words.length - 1];
    const activeIdx     = seg.words.indexOf(activeWordObj);

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.72;

    // ── Big active word ──
    const bigFs   = canvas.height * 0.13;
    const bigFont = `900 ${bigFs}px 'Space Grotesk', sans-serif`;
    ctx.font = bigFont;

    const bigText = activeWordObj.word.toUpperCase();
    const bigW    = ctx.measureText(bigText).width;

    // Yellow fill with subtle black stroke
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth   = bigFs * 0.06;
    ctx.lineJoin    = 'round';
    ctx.font = bigFont;
    ctx.strokeText(bigText, centerX - bigW / 2, centerY);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(bigText,   centerX - bigW / 2, centerY);

    // ── Remaining words (small, white, below) ──
    const restWords = seg.words
      .filter((_, i) => i !== activeIdx)
      .map(w => w.word)
      .join(' ');

    if (restWords.trim()) {
      const smFs   = canvas.height * 0.042;
      const smFont = `500 ${smFs}px 'Inter', sans-serif`;
      ctx.font = smFont;
      const smW = ctx.measureText(restWords).width;

      ctx.fillStyle   = 'rgba(255,255,255,0.85)';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = 6;
      ctx.fillText(restWords, centerX - smW / 2, centerY + bigFs * 0.72);
      ctx.shadowBlur  = 0;
    }
  }

  /**
   * THORA CINEMATIC
   * Two-tier layout:
   *   TOP  — full sentence text, small, dim, widely letter-spaced
   *   BOTTOM — active word(s), larger, bright white, bold
   * Monochromatic cool-blue palette.
   */
  function thoraCinematic(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const centerX = canvas.width / 2;

    // ── TOP LINE — dim context (all words small + spaced) ──
    const topFs   = canvas.height * 0.036;
    const topFont = `600 ${topFs}px 'Inter', sans-serif`;
    ctx.font         = topFont;
    ctx.letterSpacing = '0.22em';

    const topText = seg.words.map(w => w.word.toUpperCase()).join('  ');
    const topW    = ctx.measureText(topText).width;
    const topY    = canvas.height * 0.72;

    ctx.fillStyle   = 'rgba(160,170,210,0.45)';
    ctx.fillText(topText, centerX - topW / 2, topY);
    ctx.letterSpacing = '0';

    // ── BOTTOM LINE — active word(s), big & bright ──
    const activeWords = seg.words
      .filter(w => t >= w.start && t <= w.end + 0.1)
      .map(w => w.word.toUpperCase())
      .join('  ');

    const displayText = activeWords || seg.words[0].word.toUpperCase();

    const botFs   = canvas.height * 0.072;
    const botFont = `800 ${botFs}px 'Space Grotesk', sans-serif`;
    ctx.font         = botFont;
    ctx.letterSpacing = '0.08em';

    const botW = ctx.measureText(displayText).width;
    const botY = topY + topFs * 1.9;

    // Subtle glow
    ctx.shadowColor = 'rgba(160,180,255,0.35)';
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = '#FFFFFF';
    ctx.fillText(displayText, centerX - botW / 2, botY);
    ctx.shadowBlur    = 0;
    ctx.letterSpacing = '0';
  }

  /**
   * LIQUID GLASS (proper)
   * Frosted-glass pill capsule behind the current segment text.
   * White text inside. Soft blur illusion via layered fills.
   */
  function liquidGlassProper(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.052;
    const font = `500 ${fs}px 'Inter', sans-serif`;
    ctx.font   = font;

    const text = seg.text;
    const textW = ctx.measureText(text).width;

    const padX   = fs * 1.0;
    const padY   = fs * 0.55;
    const pillW  = textW + padX * 2;
    const pillH  = fs + padY * 2;
    const pillR  = pillH / 2; // fully rounded (capsule)

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.8;
    const pillX   = centerX - pillW / 2;
    const pillY   = centerY - pillH / 2;

    // Helper to draw the pill path
    function pillPath() {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
      } else {
        ctx.arc(pillX + pillR, pillY + pillR, pillR, Math.PI, 1.5 * Math.PI);
        ctx.arc(pillX + pillW - pillR, pillY + pillR, pillR, 1.5 * Math.PI, 0);
        ctx.arc(pillX + pillW - pillR, pillY + pillH - pillR, pillR, 0, 0.5 * Math.PI);
        ctx.arc(pillX + pillR, pillY + pillH - pillR, pillR, 0.5 * Math.PI, Math.PI);
        ctx.closePath();
      }
    }

    // Layer 1: dark fill (glass dark base)
    pillPath();
    ctx.fillStyle = 'rgba(10, 12, 30, 0.52)';
    ctx.fill();

    // Layer 2: lighter glass tint
    pillPath();
    ctx.fillStyle = 'rgba(180, 195, 255, 0.08)';
    ctx.fill();

    // Layer 3: white border (glass rim)
    pillPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Layer 4: top specular highlight strip
    const hiGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH * 0.45);
    hiGrad.addColorStop(0,   'rgba(255,255,255,0.14)');
    hiGrad.addColorStop(1,   'rgba(255,255,255,0.00)');
    pillPath();
    ctx.fillStyle = hiGrad;
    ctx.fill();

    // Text — word-by-word coloring
    const lineWords = seg.words;
    const lineStr   = lineWords.map(w => w.word).join(' ');
    const lineStrW  = ctx.measureText(lineStr).width;
    let   x         = centerX - lineStrW / 2;
    const textY     = centerY + fs * 0.35;

    lineWords.forEach((w, i) => {
      const chunk  = w.word + (i < lineWords.length - 1 ? ' ' : '');
      const chunkW = ctx.measureText(chunk).width;
      const active = t >= w.start && t <= w.end + 0.05;

      ctx.font      = font;
      ctx.fillStyle = active ? '#FFFFFF' : 'rgba(200,210,240,0.65)';
      if (active) {
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur  = 8;
      }
      ctx.fillText(chunk, x, textY);
      ctx.shadowBlur = 0;
      x += chunkW;
    });
  }

  /**
   * PIXELATED WORD
   * TOP: dim, small, underscores-between-words label ("THE_QUICK")
   * BOTTOM: active word rendered LARGE in a pixel/blocky look
   *   achieved by drawing at 1/4 size then scaling 4x with
   *   imageSmoothingEnabled = false.
   */
  function pixelatedWord(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const centerX = canvas.width  / 2;

    // ── TOP: dim underscore-joined label ──
    const topText = seg.words.map(w => w.word.toUpperCase()).join('_');
    const topFs   = canvas.height * 0.034;
    const topFont = `600 ${topFs}px monospace`;
    ctx.font         = topFont;
    ctx.letterSpacing = '0.18em';
    const topW = ctx.measureText(topText).width;
    const topY = canvas.height * 0.68;

    ctx.fillStyle = 'rgba(180,185,220,0.30)';
    ctx.fillText(topText, centerX - topW / 2, topY);
    ctx.letterSpacing = '0';

    // ── BOTTOM: Pixelated active word ──
    const activeWordObj = seg.words.find(w => t >= w.start && t <= w.end + 0.05)
                        || seg.words[Math.floor(seg.words.length / 2)];
    const bigText = activeWordObj.word.toUpperCase();

    // Pixel render: draw small on offscreen, scale up blocky
    const scale  = 4;
    const bigFs  = canvas.height * 0.092;
    const bigFont = `900 ${Math.round(bigFs / scale)}px monospace`;

    const offW = Math.ceil(canvas.width  / scale);
    const offH = Math.ceil(canvas.height / scale);
    const off   = document.createElement('canvas');
    off.width   = offW;
    off.height  = offH;
    const offCtx = off.getContext('2d');
    offCtx.imageSmoothingEnabled = false;

    offCtx.font      = bigFont;
    offCtx.fillStyle = '#FFFFFF';
    const tw = offCtx.measureText(bigText).width;
    const tx = offW / 2 - tw / 2;
    const ty = canvas.height * 0.82 / scale;

    offCtx.fillText(bigText, tx, ty);

    // Draw scaled-up pixelated result
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, offW, offH, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;

    // Subtle color tint on the active word area — multicolor pixel feel
    // Draw tiny colored pixels overlay for authenticity
    const colors = ['#FF6B35','#FFD700','#8B5CF6','#39FF14','#00FFFF'];
    const pixelSize = Math.max(2, canvas.width * 0.004);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 12; i++) {
      const px = centerX + (Math.sin(i * 137.5) * canvas.width * 0.22);
      const py = canvas.height * 0.78 + (Math.cos(i * 97.3) * canvas.height * 0.05);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(Math.round(px / pixelSize) * pixelSize,
                   Math.round(py / pixelSize) * pixelSize,
                   pixelSize * 2, pixelSize * 2);
    }
    ctx.globalAlpha = 1;
  }

  // ════════════════════════════════════════════════════════════
  // BATCH 2 — USER STYLES
  // ════════════════════════════════════════════════════════════

  /**
   * BLACK PUNCH
   * Metallic silver/gray gradient bg panel.
   * Active word = large, dark, bold — punches out of center.
   * Context words above & below in small, dim italic.
   */
  function blackPunch(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    // Find active word index
    const activeIdx = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    const ai = activeIdx < 0 ? 0 : activeIdx;
    const activeWord = seg.words[ai];

    const cx = canvas.width  / 2;
    const cy = canvas.height * 0.74;

    // Size constants
    const bigFs = canvas.height * 0.10;
    const smFs  = canvas.height * 0.034;
    const bigFont = `900 ${bigFs}px 'Space Grotesk', sans-serif`;
    const smFont  = `400 italic ${smFs}px 'Inter', sans-serif`;

    // Measure big text to size the background panel
    ctx.font = bigFont;
    const bigText = activeWord.word.toUpperCase();
    const bigW    = ctx.measureText(bigText).width;

    // Context words above (words before active)
    const aboveText = seg.words.slice(0, ai).map(w => w.word).join(' ');
    // Context words below (words after active)
    const belowText = seg.words.slice(ai + 1).map(w => w.word).join(' ');

    ctx.font = smFont;
    const aboveW = ctx.measureText(aboveText).width;
    const belowW = ctx.measureText(belowText).width;

    const panelW = Math.max(bigW, aboveW, belowW) + canvas.width * 0.12;
    const panelH = bigFs * 1.1 + smFs * 2.8 + canvas.height * 0.06;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    // ── Metallic silver gradient background ──
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0,    '#D8D8D8');
    grad.addColorStop(0.35, '#C0C0C0');
    grad.addColorStop(0.5,  '#A8A8A8');
    grad.addColorStop(0.65, '#B8B8B8');
    grad.addColorStop(1,    '#989898');

    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    else ctx.rect(panelX, panelY, panelW, panelH);
    ctx.fill();

    // Subtle dark border
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── Context above ──
    if (aboveText) {
      ctx.font      = smFont;
      ctx.fillStyle = 'rgba(60,60,60,0.65)';
      ctx.fillText(aboveText, cx - aboveW / 2, panelY + smFs * 1.3);
    }

    // ── Active word — large dark ──
    ctx.font = bigFont;
    ctx.fillStyle = '#1A1A1A';
    // Inner shadow effect (draw slightly offset in grey first)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(bigText, cx - bigW / 2 + 1.5, cy + bigFs * 0.35 + 1.5);
    ctx.fillStyle = '#111111';
    ctx.fillText(bigText, cx - bigW / 2, cy + bigFs * 0.35);

    // ── Context below ──
    if (belowText) {
      ctx.font      = smFont;
      ctx.fillStyle = 'rgba(60,60,60,0.65)';
      const bw = ctx.measureText(belowText).width;
      ctx.fillText(belowText, cx - bw / 2, panelY + panelH - smFs * 0.5);
    }
  }

  /**
   * HIGHLIGHTED WORD
   * Full sentence on one line.
   * Active word: orange/amber, bold.
   * Rest of words: white, regular weight.
   */
  function highlightedWord(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs      = canvas.height * 0.06;
    const boldFont= `700 ${fs}px 'Inter', sans-serif`;
    const normFont= `500 ${fs}px 'Inter', sans-serif`;
    const cx      = canvas.width  / 2;
    const baseY   = canvas.height * 0.80;

    // First pass: measure total line width
    let totalW = 0;
    seg.words.forEach((w, i) => {
      const chunk = w.word + (i < seg.words.length - 1 ? ' ' : '');
      const active = t >= w.start && t <= w.end + 0.05;
      ctx.font = active ? boldFont : normFont;
      totalW += ctx.measureText(chunk).width;
    });

    // Second pass: draw each word
    let x = cx - totalW / 2;
    seg.words.forEach((w, i) => {
      const chunk  = w.word + (i < seg.words.length - 1 ? ' ' : '');
      const active = t >= w.start && t <= w.end + 0.05;
      ctx.font = active ? boldFont : normFont;
      const chunkW = ctx.measureText(chunk).width;

      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = active ? 0 : 5;

      if (active) {
        ctx.fillStyle = '#FF8C00'; // orange
      } else {
        ctx.fillStyle = '#FFFFFF';
      }

      ctx.fillText(chunk, x, baseY);
      ctx.shadowBlur = 0;
      x += chunkW;
    });
  }

  /**
   * DEVIN JATHO
   * Active word = large, bold, MAGENTA/PURPLE, center.
   * Surrounding words = smaller, white, flanking on left & right.
   * All roughly on the same baseline.
   */
  function devinJatho(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const ai = Math.max(0, seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05));
    const activeWord = seg.words[ai];

    const bigFs   = canvas.height * 0.085;
    const smFs    = canvas.height * 0.04;
    const bigFont = `900 ${bigFs}px 'Space Grotesk', sans-serif`;
    const smFont  = `600 ${smFs}px 'Inter', sans-serif`;
    const cx      = canvas.width / 2;
    const baseY   = canvas.height * 0.76;

    // Measure all parts
    ctx.font = bigFont;
    const activeText = activeWord.word.toUpperCase();
    const activeW    = ctx.measureText(activeText).width;

    ctx.font = smFont;
    const leftWords  = seg.words.slice(0, ai).map(w => w.word.toUpperCase()).join('  ');
    const rightWords = seg.words.slice(ai + 1).map(w => w.word.toUpperCase()).join('  ');
    const leftW  = leftWords  ? ctx.measureText(leftWords  + '  ').width : 0;
    const rightW = rightWords ? ctx.measureText('  ' + rightWords).width : 0;

    const gap    = canvas.width * 0.025;
    const totalW = leftW + gap + activeW + gap + rightW;
    let   x      = cx - totalW / 2;

    // ── Left words ──
    if (leftWords) {
      ctx.font      = smFont;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 5;
      ctx.fillText(leftWords, x, baseY + (bigFs - smFs) * 0.45);
      ctx.shadowBlur = 0;
      x += leftW + gap;
    }

    // ── Active word (magenta) ──
    ctx.font = bigFont;
    // Glow
    ctx.shadowColor = 'rgba(180,0,255,0.45)';
    ctx.shadowBlur  = 20;
    ctx.fillStyle   = '#CC44FF';
    ctx.fillText(activeText, x, baseY);
    // Draw again sharper on top
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#DD55FF';
    ctx.fillText(activeText, x, baseY);
    x += activeW + gap;

    // ── Right words ──
    if (rightWords) {
      ctx.font      = smFont;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 5;
      ctx.fillText(rightWords, x, baseY + (bigFs - smFs) * 0.45);
      ctx.shadowBlur = 0;
    }
  }

  /**
   * IMAN GADZHI
   * Clean, professional, minimal.
   * Bold white all-caps text, 2 lines, centered.
   * No glow, no effects — just crisp typography.
   */
  function imanGadzhi(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs   = canvas.height * 0.065;
    const font = `800 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.font   = font;

    const maxW = canvas.width * 0.78;
    const lines = wrapWords(ctx, seg.words, maxW, font);
    const lh    = fs * 1.28;
    let   baseY = canvas.height * 0.78 - (lines.length - 1) * lh * 0.5;

    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => w.word.toUpperCase()).join(' ');
      const lineW   = ctx.measureText(lineStr).width;

      // Very subtle shadow for readability on any background
      ctx.shadowColor   = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur    = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle     = '#FFFFFF';
      ctx.font          = font;
      ctx.fillText(lineStr, (canvas.width - lineW) / 2, baseY);
      ctx.shadowBlur    = 0;
      ctx.shadowOffsetY = 0;

      baseY += lh;
    });
  }



  const STYLES = {
    'hormozi':       hormozi,
    'word-pop':      wordPop,
    'bubble':        bubble,
    'karaoke':       karaoke,
    'neon':          neon,
    'fire':          fire,
    'glitch':        glitch,
    'prism':         prism,
    'deep-glow':     deepGlow,
    'mrbeast':       mrbeast,
    'highlighted':   highlighted,
    'classic':       classic,
    'cinematic':     cinematic,
    'matrix':        matrix,
    'gold':          gold,
    'ice':           ice,
    'minimal':       minimal,
    'bounce':        bounce,
    'typewriter':    typewriter,
    'retro':         retro,
    'comic':         comic,
    'outline':       outline,
    'shadow-drop':   shadow_drop,
    'gradient-pop':  gradient_pop,
    'podcast':       podcast,
    'street':        street,
    'news':          newsTicker,
    'liquid-glass':  liquidGlassProper,
    'delhi':         delhi,
    'word-reveal':   wordReveal,
    // ── New user-requested styles
    'big-reveal':       bigReveal,
    'thora-cinematic':  thoraCinematic,
    'pixelated-word':   pixelatedWord,
    // ── Batch 2
    'black-punch':      blackPunch,
    'highlighted-word': highlightedWord,
    'devin-jatho':      devinJatho,
    'iman-gadzhi':      imanGadzhi,
    // ── Batch 3
    'mrbeast-2':        mrBeastStyle2,
    'editing-skool':    editingSkool,
    'mrbeast-1':        mrBeastStyle1,
    'hormozi-green':    hormoziGreen,
    // ── Batch 4
    'bubble-style':     bubbleStyle,
    'clean-motion':     cleanMotion,
    'ali-abdaal':       aliAbdaal,
    'blockbuster':      blockbuster,
    // ── Batch 5
    'archives':         archivesStyle,
    'scribble':         scribbleStyle,
    'big-red':          theBigRed,
    'swiss':            swissEditorial,
    // ── Batch 6
    'aura':             auraStyle,
    'editor-masala':    editorMasala,
    'illusion':         illusionStyle,
    // ── Batch 7 (Captik Collection)
    'captik':           captikOriginal,
    'captik-shadow':    captikShadow,
    'captik-glow':      captikGlow,
    // ── Batch 8 (Trending Viral)
    'velocity-flash':   velocityFlash,
    'luke-belmar':      lukeBelmar,
    'submagic-karaoke': submagicKaraoke,
  };

  // ════════════════════════════════════════════════════════════
  // BATCH 3 — USER STYLES
  // ════════════════════════════════════════════════════════════

  /**
   * MR BEAST STYLE 2
   * Layout: small white "THE" — huge YELLOW "BROWN" — small white "FOX"
   * All inline, no background. Bold, punchy thumbnail style.
   */
  function mrBeastStyle2(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const bigFs   = canvas.height * 0.092;
    const smFs    = canvas.height * 0.042;
    const bigFont = `900 ${bigFs}px 'Space Grotesk', sans-serif`;
    const smFont  = `700 ${smFs}px 'Space Grotesk', sans-serif`;
    const cx      = canvas.width  / 2;
    const baseY   = canvas.height * 0.77;

    ctx.font = bigFont;
    const activeText = activeWord.word.toUpperCase();
    const activeW    = ctx.measureText(activeText).width;

    ctx.font = smFont;
    const leftText  = seg.words.slice(0, ai).map(w => w.word.toUpperCase()).join(' ');
    const rightText = seg.words.slice(ai + 1).map(w => w.word.toUpperCase()).join(' ');
    const leftW  = leftText  ? ctx.measureText(leftText).width  : 0;
    const rightW = rightText ? ctx.measureText(rightText).width : 0;

    const gap    = canvas.width * 0.022;
    const totalW = (leftW ? leftW + gap : 0) + activeW + (rightW ? gap + rightW : 0);
    let x = cx - totalW / 2;

    // Left small words
    if (leftText) {
      ctx.font      = smFont;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5;
      ctx.fillText(leftText, x, baseY + (bigFs - smFs) * 0.48);
      ctx.shadowBlur = 0;
      x += leftW + gap;
    }

    // Center active word — yellow + shadow
    ctx.font = bigFont;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(activeText, x, baseY);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    x += activeW + gap;

    // Right small words
    if (rightText) {
      ctx.font      = smFont;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5;
      ctx.fillText(rightText, x, baseY + (bigFs - smFs) * 0.48);
      ctx.shadowBlur = 0;
    }
  }

  /**
   * EDITING SKOOL
   * Solid orange/amber rounded rectangle (pill) behind active word.
   * Dark bold text on the pill. Dim italic context words above & below.
   */
  function editingSkool(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const cx     = canvas.width  / 2;
    const cy     = canvas.height * 0.75;
    const bigFs  = canvas.height * 0.092;
    const smFs   = canvas.height * 0.034;
    const bigFont = `900 ${bigFs}px 'Space Grotesk', sans-serif`;
    const smFont  = `400 italic ${smFs}px 'Inter', sans-serif`;

    // Context text
    const aboveText = seg.words.slice(0, ai).map(w => w.word).join(' ');
    const belowText = seg.words.slice(ai + 1).map(w => w.word).join(' ');

    // Measure pill size
    ctx.font = bigFont;
    const activeText = activeWord.word.toUpperCase();
    const activeW    = ctx.measureText(activeText).width;
    const padX = canvas.width * 0.055;
    const padY = bigFs * 0.28;
    const pillW = activeW + padX * 2;
    const pillH = bigFs + padY * 2;
    const pillR = pillH * 0.22;
    const pillX = cx - pillW / 2;
    const pillY = cy - pillH / 2;

    // ── Draw orange pill ──
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();

    // Subtle inner highlight at top
    const hiG = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH * 0.5);
    hiG.addColorStop(0, 'rgba(255,255,255,0.18)');
    hiG.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hiG;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();

    // ── Active word text (dark on orange) ──
    ctx.font      = bigFont;
    ctx.fillStyle = '#0D0D0D';
    ctx.fillText(activeText, cx - activeW / 2, pillY + pillH * 0.74);

    // ── Context above ──
    if (aboveText) {
      ctx.font = smFont;
      const aw = ctx.measureText(aboveText).width;
      ctx.fillStyle   = 'rgba(220,220,220,0.55)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(aboveText, cx - aw / 2, pillY - smFs * 0.5);
      ctx.shadowBlur = 0;
    }

    // ── Context below ──
    if (belowText) {
      ctx.font = smFont;
      const bw = ctx.measureText(belowText).width;
      ctx.fillStyle   = 'rgba(220,220,220,0.55)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(belowText, cx - bw / 2, pillY + pillH + smFs * 1.2);
      ctx.shadowBlur = 0;
    }
  }

  /**
   * MR BEAST STYLE 1
   * Small dim flanking words + huge white center word with THICK BLACK STROKE.
   * Classic MrBeast thumbnail caption look.
   */
  function mrBeastStyle1(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const bigFs   = canvas.height * 0.095;
    const smFs    = canvas.height * 0.038;
    const bigFont = `900 ${bigFs}px 'Space Grotesk', sans-serif`;
    const smFont  = `600 ${smFs}px 'Space Grotesk', sans-serif`;
    const cx      = canvas.width  / 2;
    const baseY   = canvas.height * 0.77;

    ctx.font = bigFont;
    const activeText = activeWord.word.toUpperCase();
    const activeW    = ctx.measureText(activeText).width;

    ctx.font = smFont;
    const leftText  = seg.words.slice(0, ai).map(w => w.word.toUpperCase()).join(' ');
    const rightText = seg.words.slice(ai + 1).map(w => w.word.toUpperCase()).join(' ');
    const leftW  = leftText  ? ctx.measureText(leftText).width  : 0;
    const rightW = rightText ? ctx.measureText(rightText).width : 0;

    const gap    = canvas.width * 0.022;
    const totalW = (leftW ? leftW + gap : 0) + activeW + (rightW ? gap + rightW : 0);
    let x = cx - totalW / 2;

    // Left words — small, dim
    if (leftText) {
      ctx.font      = smFont;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth   = smFs * 0.15;
      ctx.lineJoin    = 'round';
      ctx.strokeText(leftText, x, baseY + (bigFs - smFs) * 0.46);
      ctx.fillStyle = 'rgba(200,200,200,0.72)';
      ctx.fillText(leftText, x, baseY + (bigFs - smFs) * 0.46);
      x += leftW + gap;
    }

    // Center active word — huge, white, thick black stroke
    ctx.font      = bigFont;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth   = bigFs * 0.14;
    ctx.lineJoin    = 'round';
    ctx.strokeText(activeText, x, baseY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(activeText, x, baseY);
    x += activeW + gap;

    // Right words — small, dim
    if (rightText) {
      ctx.font      = smFont;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth   = smFs * 0.15;
      ctx.lineJoin    = 'round';
      ctx.strokeText(rightText, x, baseY + (bigFs - smFs) * 0.46);
      ctx.fillStyle = 'rgba(200,200,200,0.72)';
      ctx.fillText(rightText, x, baseY + (bigFs - smFs) * 0.46);
    }
  }

  /**
   * HORMOZI GREEN
   * All words in lime/bright green. Active word scales larger.
   * Classic Alex Hormozi signature style: big, bold, green.
   */
  function hormoziGreen(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    const fs      = canvas.height * 0.068;
    const activeScale = 1.28;
    const normFont  = `800 ${fs}px 'Space Grotesk', sans-serif`;
    const activeFont = `900 ${fs * activeScale}px 'Space Grotesk', sans-serif`;
    const cx        = canvas.width  / 2;
    const baseY     = canvas.height * 0.78;

    // First pass — measure total line width
    let totalW = 0;
    seg.words.forEach((w, i) => {
      const active = t >= w.start && t <= w.end + 0.05;
      ctx.font = active ? activeFont : normFont;
      totalW += ctx.measureText(w.word + (i < seg.words.length - 1 ? ' ' : '')).width;
    });

    // If too wide, wrap to 2 lines using classic renderer
    if (totalW > canvas.width * 0.9) {
      ctx.font = normFont;
      const lines = wrapWords(ctx, seg.words, canvas.width * 0.88, normFont);
      const lh    = fs * 1.32;
      let ly = baseY - (lines.length - 1) * lh * 0.5;

      lines.forEach(lineWords => {
        const lineStr = lineWords.map(w => w.word.toUpperCase()).join(' ');
        const lineW   = ctx.measureText(lineStr).width;
        ctx.fillStyle   = '#7CFC00';
        ctx.shadowColor = 'rgba(0,80,0,0.5)';
        ctx.shadowBlur  = 6;
        ctx.font = normFont;
        ctx.fillText(lineStr, (canvas.width - lineW) / 2, ly);
        ctx.shadowBlur = 0;
        ly += lh;
      });
      return;
    }

    // Second pass — draw inline
    let x = cx - totalW / 2;
    seg.words.forEach((w, i) => {
      const active  = t >= w.start && t <= w.end + 0.05;
      ctx.font = active ? activeFont : normFont;
      const chunk  = w.word.toUpperCase() + (i < seg.words.length - 1 ? ' ' : '');
      const chunkW = ctx.measureText(chunk).width;

      const vertOff = active ? -(fs * (activeScale - 1) * 0.5) : 0;

      if (active) {
        ctx.shadowColor = 'rgba(100,255,0,0.5)';
        ctx.shadowBlur  = 12;
      }
      ctx.fillStyle = '#7CFC00';
      ctx.fillText(chunk, x, baseY + vertOff);
      ctx.shadowBlur = 0;
      x += chunkW;
    });
  }

  // ════════════════════════════════════════════════════════════
  // BATCH 4 — USER STYLES
  // ════════════════════════════════════════════════════════════

  /**
   * BUBBLE STYLE
   * Reference: "the [quick] fox"
   * Sentence displayed inline.
   * Inactive words: clean bold white with subtle black drop shadow.
   * Active word: enclosed inside an emerald/mint green rounded bubble pill (#40A776),
   * dark charcoal/green text inside (#082618), bold sans-serif.
   */
  function bubbleStyle(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.065;
    const font = `700 ${fs}px 'Space Grotesk', 'Inter', sans-serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.78;

    ctx.font = font;

    const gap = canvas.width * 0.024;
    const padX = fs * 0.55;
    const padY = fs * 0.28;
    const pillH = fs + padY * 2;
    const pillR = pillH * 0.38;

    const wordMeasures = seg.words.map((w, i) => {
      const isAct = (i === ai);
      const text = w.word;
      const textW = ctx.measureText(text).width;
      const blockW = isAct ? (textW + padX * 2) : textW;
      return { text, textW, blockW, isAct };
    });

    const totalW = wordMeasures.reduce((acc, m) => acc + m.blockW, 0) + (seg.words.length - 1) * gap;
    let x = cx - totalW / 2;

    wordMeasures.forEach(m => {
      if (m.isAct) {
        const pillX = x;
        const pillY = baseY - fs * 0.85 - padY;
        const pillW = m.blockW;

        ctx.fillStyle = '#40A776';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
        else ctx.rect(pillX, pillY, pillW, pillH);
        ctx.fill();

        ctx.fillStyle = '#062014';
        ctx.font = font;
        ctx.fillText(m.text, pillX + padX, baseY);
        x += pillW + gap;
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.font = font;
        ctx.fillText(m.text, x, baseY);
        ctx.shadowBlur = 0;
        x += m.blockW + gap;
      }
    });
  }

  /**
   * CLEAN MOTION
   * Subtitle: "one word at a time"
   * Displays ONLY the current active word in bold, clean white sans-serif
   * with a subtle chromatic kinetic offset (RGB fringe) that feels snappy and modern.
   */
  function cleanMotion(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];
    if (!activeWord) return;

    const fs = canvas.height * 0.115;
    const font = `900 ${fs}px 'Inter', 'Space Grotesk', sans-serif`;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    ctx.font = font;
    const text = activeWord.word;
    const textW = ctx.measureText(text).width;
    const tx = cx - textW / 2;
    const ty = cy + fs * 0.35;

    // Subtle chromatic aberration (red/cyan fringe for kinetic motion feel)
    ctx.fillStyle = 'rgba(255, 30, 80, 0.45)';
    ctx.fillText(text, tx + 2, ty);

    ctx.fillStyle = 'rgba(0, 220, 255, 0.45)';
    ctx.fillText(text, tx - 2, ty);

    // Main sharp white text
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, tx, ty);
    ctx.shadowBlur = 0;
  }

  /**
   * ALI ABDAAL
   * Signature YouTube creator style:
   * Dark translucent container pill.
   * Context words are muted gray.
   * Active word is enclosed in a crisp white rounded pill with bold black text.
   */
  function aliAbdaal(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.062;
    const font = `700 ${fs}px 'Inter', sans-serif`;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.76;

    ctx.font = font;

    const gap = canvas.width * 0.022;
    const pillPadX = fs * 0.52;
    const pillPadY = fs * 0.26;
    const whitePillH = fs + pillPadY * 2;
    const whitePillR = whitePillH * 0.28;

    // Measure words
    const items = seg.words.map((w, idx) => {
      const isAct = (idx === ai);
      const text = w.word;
      const tw = ctx.measureText(text).width;
      const bw = isAct ? (tw + pillPadX * 2) : tw;
      return { text, tw, bw, isAct };
    });

    const innerContentW = items.reduce((acc, it) => acc + it.bw, 0) + (items.length - 1) * gap;

    // Dark container dimensions
    const outerPadX = canvas.width * 0.04;
    const outerPadY = fs * 0.38;
    const outerW = innerContentW + outerPadX * 2;
    const outerH = whitePillH + outerPadY * 2;
    const outerR = outerH * 0.26;
    const outerX = cx - outerW / 2;
    const outerY = cy - outerH / 2;

    // ── 1. Draw dark background capsule ──
    ctx.fillStyle = 'rgba(28, 31, 42, 0.92)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(outerX, outerY, outerW, outerH, outerR);
    else ctx.rect(outerX, outerY, outerW, outerH);
    ctx.fill();

    // Subtle outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── 2. Render words ──
    const baseY = cy + fs * 0.34;
    let curX = outerX + outerPadX;

    items.forEach(it => {
      if (it.isAct) {
        // Crisp white inner pill
        const wpx = curX;
        const wpy = cy - whitePillH / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(wpx, wpy, it.bw, whitePillH, whitePillR);
        else ctx.rect(wpx, wpy, it.bw, whitePillH);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Solid black text
        ctx.fillStyle = '#0F1117';
        ctx.font = `800 ${fs}px 'Inter', sans-serif`;
        ctx.fillText(it.text, wpx + pillPadX, baseY);

        curX += it.bw + gap;
      } else {
        // Muted context words
        ctx.fillStyle = 'rgba(175, 185, 210, 0.72)';
        ctx.font = font;
        ctx.fillText(it.text, curX, baseY);
        curX += it.bw + gap;
      }
    });
  }

  /**
   * BLOCKBUSTER
   * Badges: Kinetic, Cinematic
   * Top line: Bold all-caps condensed text in intense neon red glow (#FF2438).
   * Bottom line / active phrase: Stylized script/cursive in glowing bright white (#FFFFFF).
   */
  function blockbuster(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const totalWords = seg.words.length;
    let topWords, bottomWords;
    if (totalWords <= 2) {
      topWords = [seg.words[0]];
      bottomWords = seg.words.slice(1);
    } else {
      const splitIdx = Math.max(1, Math.min(ai + 1, Math.ceil(totalWords / 2)));
      topWords = seg.words.slice(0, splitIdx);
      bottomWords = seg.words.slice(splitIdx);
    }
    if (bottomWords.length === 0) {
      bottomWords = [topWords.pop()];
    }

    const topText = topWords.map(w => w.word.toUpperCase()).join(' ');
    const botText = bottomWords.map(w => w.word).join(' ');

    const topFs = canvas.height * 0.072;
    const botFs = canvas.height * 0.088;
    const topFont = `900 ${topFs}px 'Space Grotesk', Impact, sans-serif`;
    const botFont = `700 italic ${botFs}px 'Caveat', 'Dancing Script', cursive, sans-serif`;

    const topY = cy - topFs * 0.35;
    const botY = cy + botFs * 0.85;

    // ── 1. Top row: Red Neon Glow ──
    ctx.font = topFont;
    const topW = ctx.measureText(topText).width;
    const topX = cx - topW / 2;

    // Neon glow layers
    ctx.shadowColor = 'rgba(255, 20, 50, 0.95)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#FF2438';
    ctx.fillText(topText, topX, topY);
    ctx.fillText(topText, topX, topY);

    // Inner bright core
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#FF8590';
    ctx.fillText(topText, topX, topY);
    ctx.shadowBlur = 0;

    // ── 2. Bottom row: Stylized Script White + Warm Rim ──
    ctx.font = botFont;
    const botW = ctx.measureText(botText).width;
    const botX = cx - botW / 2;

    // Warm aura
    ctx.shadowColor = 'rgba(255, 120, 40, 0.6)';
    ctx.shadowBlur = 12;

    // Subtle outline
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.8)';
    ctx.lineWidth = botFs * 0.08;
    ctx.strokeText(botText, botX, botY);

    // Bright white fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(botText, botX, botY);
    ctx.shadowBlur = 0;
  }

  // ════════════════════════════════════════════════════════════
  // BATCH 5 — USER STYLES
  // ════════════════════════════════════════════════════════════

  /**
   * ARCHIVES
   * Badges: Kinetic, Handwritten
   * Handwritten cursive script with warm peach/amber fringe shadow.
   * Active word is accented and decorated with a wavy underline underneath.
   */
  function archivesStyle(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.088;
    const font = `700 italic ${fs}px 'Caveat', 'Dancing Script', cursive, sans-serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.76;

    ctx.font = font;
    const gap = canvas.width * 0.022;

    const items = seg.words.map((w, idx) => {
      const text = w.word;
      const tw = ctx.measureText(text).width;
      return { text, tw, isAct: idx === ai };
    });

    const totalW = items.reduce((acc, it) => acc + it.tw, 0) + (items.length - 1) * gap;
    let x = cx - totalW / 2;

    items.forEach(it => {
      // Warm peach/amber chromatic shadow
      ctx.fillStyle = 'rgba(255, 145, 80, 0.75)';
      ctx.fillText(it.text, x + 2, baseY + 1.5);

      // Off-white / cream text
      ctx.fillStyle = it.isAct ? '#FFFFFF' : '#FFF2E6';
      ctx.fillText(it.text, x, baseY);

      // Active word gets a charming wavy flourish underline
      if (it.isAct) {
        const uy = baseY + fs * 0.22;
        const uw = it.tw;
        ctx.strokeStyle = '#FFA768';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, uy);
        ctx.bezierCurveTo(x + uw * 0.3, uy - 4, x + uw * 0.7, uy + 4, x + uw, uy);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, uy + 4);
        ctx.bezierCurveTo(x + uw * 0.3, uy, x + uw * 0.7, uy + 8, x + uw - 2, uy + 4);
        ctx.stroke();
      }

      x += it.tw + gap;
    });
  }

  /**
   * SCRIBBLE
   * Badges: Kinetic, Handwritten
   * Organic hand-drawn feeling:
   * Previous/highlighted words get a wobbly yellow highlighter patch.
   * Active word gets a sketchy red circle loop drawn around it.
   */
  function scribbleStyle(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.078;
    const font = `700 ${fs}px 'Caveat', 'Inter', cursive, sans-serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.76;

    ctx.font = font;
    const gap = canvas.width * 0.026;

    const items = seg.words.map((w, idx) => {
      const text = w.word;
      const tw = ctx.measureText(text).width;
      return { text, tw, isAct: idx === ai, isPrev: idx === ai - 1 };
    });

    const totalW = items.reduce((acc, it) => acc + it.tw, 0) + (items.length - 1) * gap;
    let x = cx - totalW / 2;

    items.forEach((it, idx) => {
      const cy = baseY - fs * 0.32;
      const wordCx = x + it.tw / 2;

      // 1. Yellow Highlighter Patch on context word
      if (it.isPrev || (idx === 0 && it.isAct)) {
        const patchW = it.tw + fs * 0.7;
        const patchH = fs * 1.35;
        const px = wordCx - patchW / 2;
        const py = cy - patchH / 2;

        ctx.fillStyle = '#F2CF3A';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, patchW, patchH, patchH * 0.35);
        else ctx.rect(px, py, patchW, patchH);
        ctx.fill();

        ctx.fillStyle = '#1A1708';
        ctx.font = font;
        ctx.fillText(it.text, x, baseY);
        x += it.tw + gap;
        return;
      }

      // 2. Red Scribble Circle around Active Word
      if (it.isAct) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(it.text, x, baseY);

        const rx = it.tw / 2 + fs * 0.32;
        const ry = fs * 0.72;
        ctx.strokeStyle = '#FF3838';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(wordCx, cy, rx, ry, -0.08, 0, Math.PI * 2 * 1.12);
        ctx.stroke();

        x += it.tw + gap;
        return;
      }

      // 3. Regular word
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(it.text, x, baseY);
      x += it.tw + gap;
    });
  }

  /**
   * THE BIG RED
   * Badges: Bold, Kinetic
   * Giant, deep crimson red serif word in background ("SECOND" style).
   * Foreground sentence in crisp white overlaid on top.
   */
  function theBigRed(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    // 1. Giant Background Red Serif Word
    const bigFs = canvas.height * 0.16;
    ctx.font = `900 ${bigFs}px 'Playfair Display', 'Georgia', serif`;
    const bgText = (activeWord ? activeWord.word : seg.words[0].word).toUpperCase();
    const bgW = ctx.measureText(bgText).width;

    ctx.shadowColor = 'rgba(220, 30, 45, 0.55)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#B82833';
    ctx.fillText(bgText, cx - bgW / 2, cy + bigFs * 0.32);
    ctx.shadowBlur = 0;

    // 2. Foreground Sentence
    const fgFs = canvas.height * 0.06;
    ctx.font = `700 ${fgFs}px 'Playfair Display', 'Space Grotesk', serif`;

    const fullStr = seg.words.map(w => w.word).join(' ');
    const fgW = ctx.measureText(fullStr).width;
    const fgX = cx - fgW / 2;
    const fgY = cy + fgFs * 0.28;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fullStr, fgX, fgY);
    ctx.shadowBlur = 0;
  }

  /**
   * SWISS
   * Badges: Editorial, Bold, Kinetic
   * Top line: ultra-bold lowercase white sans ("focus").
   * Bottom line: ultra-bold uppercase yellow sans ("DEEPLY").
   * Authentic Swiss modernist typography with chromatic print misregistration.
   */
  function swissEditorial(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const totalWords = seg.words.length;
    let topWords, botWords;
    if (totalWords <= 2) {
      topWords = [seg.words[0]];
      botWords = seg.words.slice(1);
    } else {
      const splitIdx = Math.max(1, Math.min(ai + 1, Math.ceil(totalWords / 2)));
      topWords = seg.words.slice(0, splitIdx);
      botWords = seg.words.slice(splitIdx);
    }
    if (botWords.length === 0) {
      botWords = [topWords.pop()];
    }

    const topText = topWords.map(w => w.word.toLowerCase()).join(' ');
    const botText = botWords.map(w => w.word.toUpperCase()).join(' ');

    const fs = canvas.height * 0.096;
    const font = `900 ${fs}px 'Inter', 'Space Grotesk', Helvetica, Arial, sans-serif`;
    ctx.font = font;

    const topW = ctx.measureText(topText).width;
    const botW = ctx.measureText(botText).width;

    const topY = cy - fs * 0.18;
    const botY = cy + fs * 0.74;

    function drawSwissLine(text, x, y, mainColor) {
      ctx.fillStyle = 'rgba(0, 230, 255, 0.45)';
      ctx.fillText(text, x - 1.8, y);
      ctx.fillStyle = 'rgba(255, 20, 60, 0.45)';
      ctx.fillText(text, x + 1.8, y);
      ctx.fillStyle = mainColor;
      ctx.fillText(text, x, y);
    }

    drawSwissLine(topText, cx - topW / 2, topY, '#FFFFFF');
    drawSwissLine(botText, cx - botW / 2, botY, '#FFD700');
  }

  // ════════════════════════════════════════════════════════════
  // BATCH 6 — USER STYLES
  // ════════════════════════════════════════════════════════════

  /**
   * AURA
   * Badges: Editorial, Bold, Kinetic
   * Top line: elegant white italic serif ("forget").
   * Bottom line: bold all-caps light sky-blue sans ("STATUS") overlapping tightly.
   */
  function auraStyle(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const totalWords = seg.words.length;
    let topWords, botWords;
    if (totalWords <= 2) {
      topWords = [seg.words[0]];
      botWords = seg.words.slice(1);
    } else {
      const splitIdx = Math.max(1, Math.min(ai + 1, Math.ceil(totalWords / 2)));
      topWords = seg.words.slice(0, splitIdx);
      botWords = seg.words.slice(splitIdx);
    }
    if (botWords.length === 0) {
      botWords = [topWords.pop()];
    }

    const topText = topWords.map(w => w.word).join(' ');
    const botText = botWords.map(w => w.word.toUpperCase()).join(' ');

    const topFs = canvas.height * 0.092;
    const botFs = canvas.height * 0.098;
    const topFont = `italic 700 ${topFs}px 'Playfair Display', serif`;
    const botFont = `900 ${botFs}px 'Space Grotesk', 'Inter', sans-serif`;

    const topY = cy - topFs * 0.12;
    const botY = cy + botFs * 0.72;

    // Top: White Italic Serif with warm amber edge
    ctx.font = topFont;
    const topW = ctx.measureText(topText).width;
    const topX = cx - topW / 2;

    ctx.fillStyle = 'rgba(255, 140, 80, 0.4)';
    ctx.fillText(topText, topX + 1.5, topY);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(topText, topX, topY);
    ctx.shadowBlur = 0;

    // Bottom: Bold Pastel Blue / Cyan Sans ("STATUS")
    ctx.font = botFont;
    const botW = ctx.measureText(botText).width;
    const botX = cx - botW / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(botText, botX + 2, botY + 2);
    ctx.fillStyle = '#7BD4FF';
    ctx.fillText(botText, botX, botY);
  }

  /**
   * EDITOR MASALA
   * Badges: Smart, Bold, Kinetic
   * Top line: small lowercase white bold sans ("trust the").
   * Bottom line: massive yellow heavyweight sans ("PROCESS").
   */
  function editorMasala(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const totalWords = seg.words.length;
    let topWords, botWords;
    if (totalWords <= 1) {
      topWords = [];
      botWords = seg.words;
    } else {
      const lastIdx = Math.max(1, seg.words.length - 1);
      topWords = seg.words.slice(0, lastIdx);
      botWords = [seg.words[lastIdx]];
    }

    const topText = topWords.map(w => w.word.toLowerCase()).join(' ');
    const botText = botWords.map(w => w.word.toUpperCase()).join(' ');

    const topFs = canvas.height * 0.042;
    const botFs = canvas.height * 0.125;
    const topFont = `700 ${topFs}px 'Space Grotesk', 'Inter', sans-serif`;
    const botFont = `900 ${botFs}px 'Space Grotesk', 'Inter', Impact, sans-serif`;

    const topY = cy - botFs * 0.46;
    const botY = cy + botFs * 0.42;

    // Top: Small context
    if (topText) {
      ctx.font = topFont;
      const topW = ctx.measureText(topText).width;
      ctx.fillStyle = 'rgba(255, 30, 80, 0.4)';
      ctx.fillText(topText, cx - topW / 2 + 1.2, topY);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(topText, cx - topW / 2, topY);
    }

    // Bottom: Massive Yellow Impact
    ctx.font = botFont;
    const botW = ctx.measureText(botText).width;
    const botX = cx - botW / 2;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = botFs * 0.08;
    ctx.strokeText(botText, botX, botY);
    ctx.fillStyle = '#FFD200';
    ctx.fillText(botText, botX, botY);
  }

  /**
   * ILLUSION
   * Badges: Bold, Kinetic
   * 3-tier layout:
   *   TOP: small context words ("he had rented the")
   *   CENTER: massive 3D chromatic illusion word ("Biggest")
   *   BOTTOM: small context words ("apartment in town")
   */
  function illusionStyle(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const aboveText = seg.words.slice(0, ai).map(w => w.word).join(' ');
    const belowText = seg.words.slice(ai + 1).map(w => w.word).join(' ');
    const heroText  = activeWord.word;

    const smFs = canvas.height * 0.038;
    const heroFs = canvas.height * 0.12;
    const smFont = `700 ${smFs}px 'Space Grotesk', 'Inter', sans-serif`;
    const heroFont = `900 ${heroFs}px 'Space Grotesk', 'Inter', sans-serif`;

    const heroY = cy + heroFs * 0.32;
    const topY = heroY - heroFs * 0.95;
    const botY = heroY + smFs * 1.55;

    // 1. Top context
    if (aboveText) {
      ctx.font = smFont;
      const aw = ctx.measureText(aboveText).width;
      ctx.fillStyle = 'rgba(255, 30, 80, 0.4)';
      ctx.fillText(aboveText, cx - aw / 2 + 1, topY);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(aboveText, cx - aw / 2, topY);
    }

    // 2. Center Hero Word with Strong Chromatic Illusion (Red/Cyan Offset)
    ctx.font = heroFont;
    const hw = ctx.measureText(heroText).width;
    const hx = cx - hw / 2;

    ctx.fillStyle = 'rgba(0, 225, 255, 0.7)';
    ctx.fillText(heroText, hx - 3, heroY);

    ctx.fillStyle = 'rgba(255, 20, 60, 0.7)';
    ctx.fillText(heroText, hx + 3, heroY);

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 8;
    ctx.fillText(heroText, hx, heroY);
    ctx.shadowBlur = 0;

    // 3. Bottom context
    if (belowText) {
      ctx.font = smFont;
      const bw = ctx.measureText(belowText).width;
      ctx.fillStyle = 'rgba(0, 225, 255, 0.4)';
      ctx.fillText(belowText, cx - bw / 2 - 1, botY);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(belowText, cx - bw / 2, botY);
    }
  }

  // ════════════════════════════════════════════════════════════
  // BATCH 7 — CAPTIK COLLECTION
  // ════════════════════════════════════════════════════════════

  /**
   * CAPTIK
   * Signature Captik default style:
   * Top: "the quick" (small dim context words)
   * Center: "BROWN" (giant electric lime-yellow, extra-bold, hard black shadow offset)
   * Bottom: "fox jumps" (small dim context words)
   */
  function captikOriginal(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const aboveText = seg.words.slice(0, ai).map(w => w.word).join(' ');
    const belowText = seg.words.slice(ai + 1).map(w => w.word).join(' ');
    const heroText  = activeWord.word.toUpperCase();

    const smFs   = canvas.height * 0.038;
    const heroFs = canvas.height * 0.125;
    const smFont   = `600 ${smFs}px 'Space Grotesk', 'Inter', sans-serif`;
    const heroFont = `900 ${heroFs}px 'Space Grotesk', 'Inter', Impact, sans-serif`;

    const heroY = cy + heroFs * 0.32;
    const topY  = heroY - heroFs * 0.96;
    const botY  = heroY + smFs * 1.55;

    // 1. Top context
    if (aboveText) {
      ctx.font = smFont;
      const aw = ctx.measureText(aboveText).width;
      ctx.fillStyle = 'rgba(170, 180, 200, 0.65)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(aboveText, cx - aw / 2, topY);
      ctx.shadowBlur = 0;
    }

    // 2. Hero Word: Electric Lime Yellow with Crisp Black Shadow
    ctx.font = heroFont;
    const hw = ctx.measureText(heroText).width;
    const hx = cx - hw / 2;

    ctx.fillStyle = '#000000';
    ctx.fillText(heroText, hx + 4, heroY + 4);

    ctx.fillStyle = '#D6FF00';
    ctx.fillText(heroText, hx, heroY);

    // 3. Bottom context
    if (belowText) {
      ctx.font = smFont;
      const bw = ctx.measureText(belowText).width;
      ctx.fillStyle = 'rgba(170, 180, 200, 0.65)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(belowText, cx - bw / 2, botY);
      ctx.shadowBlur = 0;
    }
  }

  /**
   * CAPTIK SHADOW
   * Badges: New, Bold
   * Top/bottom: small dim context words
   * Center: giant uppercase word with a crisp vertical white-to-silver metallic gradient
   * and deep dark drop shadow.
   */
  function captikShadow(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const aboveText = seg.words.slice(0, ai).map(w => w.word).join(' ');
    const belowText = seg.words.slice(ai + 1).map(w => w.word).join(' ');
    const heroText  = activeWord.word.toUpperCase();

    const smFs   = canvas.height * 0.038;
    const heroFs = canvas.height * 0.125;
    const smFont   = `600 ${smFs}px 'Space Grotesk', 'Inter', sans-serif`;
    const heroFont = `900 ${heroFs}px 'Space Grotesk', 'Inter', sans-serif`;

    const heroY = cy + heroFs * 0.32;
    const topY  = heroY - heroFs * 0.96;
    const botY  = heroY + smFs * 1.55;

    // Top context
    if (aboveText) {
      ctx.font = smFont;
      const aw = ctx.measureText(aboveText).width;
      ctx.fillStyle = 'rgba(150, 160, 180, 0.55)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(aboveText, cx - aw / 2, topY);
      ctx.shadowBlur = 0;
    }

    // Hero Word: Metallic White-to-Silver Gradient with Dark Shadow
    ctx.font = heroFont;
    const hw = ctx.measureText(heroText).width;
    const hx = cx - hw / 2;

    const grad = ctx.createLinearGradient(0, heroY - heroFs * 0.85, 0, heroY);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.55, '#E8E8E8');
    grad.addColorStop(1, '#949494');

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowOffsetY = 6;
    ctx.shadowBlur = 12;
    ctx.fillStyle = grad;
    ctx.fillText(heroText, hx, heroY);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Bottom context
    if (belowText) {
      ctx.font = smFont;
      const bw = ctx.measureText(belowText).width;
      ctx.fillStyle = 'rgba(150, 160, 180, 0.55)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(belowText, cx - bw / 2, botY);
      ctx.shadowBlur = 0;
    }
  }

  /**
   * CAPTIK GLOW
   * Badges: Popular, Bold, Glow
   * Top/bottom: small dim context words
   * Center: giant electric green word with intense radioactive neon glow.
   */
  function captikGlow(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;
    const activeWord = seg.words[ai];

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.74;

    const aboveText = seg.words.slice(0, ai).map(w => w.word).join(' ');
    const belowText = seg.words.slice(ai + 1).map(w => w.word).join(' ');
    const heroText  = activeWord.word.toUpperCase();

    const smFs   = canvas.height * 0.038;
    const heroFs = canvas.height * 0.125;
    const smFont   = `600 ${smFs}px 'Space Grotesk', 'Inter', sans-serif`;
    const heroFont = `900 ${heroFs}px 'Space Grotesk', 'Inter', sans-serif`;

    const heroY = cy + heroFs * 0.32;
    const topY  = heroY - heroFs * 0.96;
    const botY  = heroY + smFs * 1.55;

    // Top context
    if (aboveText) {
      ctx.font = smFont;
      const aw = ctx.measureText(aboveText).width;
      ctx.fillStyle = 'rgba(170, 190, 210, 0.6)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(aboveText, cx - aw / 2, topY);
      ctx.shadowBlur = 0;
    }

    // Hero Word: Neon Lime with Intense Glow Aura
    ctx.font = heroFont;
    const hw = ctx.measureText(heroText).width;
    const hx = cx - hw / 2;

    // Outer glow aura
    ctx.shadowColor = 'rgba(140, 255, 0, 0.95)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#A6FF00';
    ctx.fillText(heroText, hx, heroY);
    ctx.fillText(heroText, hx, heroY);

    // Inner bright core
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#CCFF66';
    ctx.fillText(heroText, hx, heroY);
    ctx.shadowBlur = 0;

    // Bottom context
    if (belowText) {
      ctx.font = smFont;
      const bw = ctx.measureText(belowText).width;
      ctx.fillStyle = 'rgba(170, 190, 210, 0.6)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText(belowText, cx - bw / 2, botY);
      ctx.shadowBlur = 0;
    }
  }

  // ════════════════════════════════════════════════════════════
  // BATCH 8 — TRENDING VIRAL TEMPLATES
  // ════════════════════════════════════════════════════════════

  /**
   * VELOCITY FLASH (CapCut Velocity Reels style)
   * High-energy viral format: active word pops with dynamic scale,
   * thick black contour, and an intense radial motion flash aura.
   */
  function velocityFlash(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.068;
    const baseFont = `900 ${fs}px 'Space Grotesk', Impact, sans-serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.77;

    ctx.font = baseFont;
    const gap = canvas.width * 0.024;

    const items = seg.words.map((w, idx) => {
      const isAct = idx === ai;
      const text = w.word.toUpperCase();
      const tw = ctx.measureText(text).width;
      return { text, tw, isAct, word: w };
    });

    const totalW = items.reduce((acc, it) => acc + it.tw, 0) + (items.length - 1) * gap;
    let x = cx - totalW / 2;

    items.forEach(it => {
      if (it.isAct) {
        // Flash aura behind active word
        const wCx = x + it.tw / 2;
        const wCy = baseY - fs * 0.35;
        const flashR = it.tw * 1.3 + fs;

        const flashG = ctx.createRadialGradient(wCx, wCy, 4, wCx, wCy, flashR);
        flashG.addColorStop(0, 'rgba(0, 245, 255, 0.7)');
        flashG.addColorStop(0.35, 'rgba(255, 255, 255, 0.5)');
        flashG.addColorStop(0.7, 'rgba(0, 210, 255, 0.15)');
        flashG.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = flashG;
        ctx.beginPath();
        ctx.arc(wCx, wCy, flashR, 0, Math.PI * 2);
        ctx.fill();

        // Thick black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = fs * 0.18;
        ctx.lineJoin = 'round';
        ctx.strokeText(it.text, x, baseY);

        // Vibrant cyan-to-white fill
        ctx.fillStyle = '#00F5FF';
        ctx.shadowColor = 'rgba(0, 245, 255, 0.9)';
        ctx.shadowBlur = 16;
        ctx.fillText(it.text, x, baseY);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(it.text, x, baseY);
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = fs * 0.12;
        ctx.strokeText(it.text, x, baseY);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(it.text, x, baseY);
      }
      x += it.tw + gap;
    });
  }

  /**
   * LUKE BELMAR (Luxury Minimalist Aesthetic)
   * All-caps widely letter-spaced slate text.
   * Active word is styled in 24K glowing gold with a sleek golden underline.
   */
  function lukeBelmar(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.062;
    const font = `800 ${fs}px 'Space Grotesk', sans-serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.77;

    ctx.font = font;
    const gap = canvas.width * 0.024;

    const items = seg.words.map((w, idx) => {
      const isAct = idx === ai;
      const text = w.word.toUpperCase();
      const tw = ctx.measureText(text).width;
      return { text, tw, isAct };
    });

    const totalW = items.reduce((acc, it) => acc + it.tw, 0) + (items.length - 1) * gap;
    let x = cx - totalW / 2;

    items.forEach(it => {
      if (it.isAct) {
        // 24K Gold gradient
        const goldG = ctx.createLinearGradient(x, baseY - fs, x, baseY);
        goldG.addColorStop(0, '#FFF59D');
        goldG.addColorStop(0.4, '#FFD54F');
        goldG.addColorStop(0.8, '#FFA000');
        goldG.addColorStop(1, '#FF6F00');

        ctx.shadowColor = 'rgba(255, 193, 7, 0.85)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = goldG;
        ctx.fillText(it.text, x, baseY);
        ctx.shadowBlur = 0;

        // Sleek golden underline
        const uy = baseY + fs * 0.22;
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, uy);
        ctx.lineTo(x + it.tw, uy);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(185, 195, 215, 0.45)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
        ctx.fillText(it.text, x, baseY);
        ctx.shadowBlur = 0;
      }
      x += it.tw + gap;
    });
  }

  /**
   * SUBMAGIC KARAOKE (Cyan-to-Purple Gradient Wipe)
   * The signature viral subtitle look used by top creators on Submagic:
   * Smooth two-tone neon gradient on active word with subtle float pop.
   */
  function submagicKaraoke(ctx, canvas, words, t) {
    clearCanvas(ctx, canvas);
    const seg = getActiveSegment(window.__SUBZFREE_SEGMENTS__ || [], t);
    if (!seg) return;

    let ai = seg.words.findIndex(w => t >= w.start && t <= w.end + 0.05);
    if (ai < 0) ai = 0;

    const fs = canvas.height * 0.068;
    const font = `800 ${fs}px 'Inter', 'Space Grotesk', sans-serif`;
    const cx = canvas.width / 2;
    const baseY = canvas.height * 0.77;

    ctx.font = font;
    const gap = canvas.width * 0.024;

    const items = seg.words.map((w, idx) => {
      const isAct = idx === ai;
      const text = w.word;
      const tw = ctx.measureText(text).width;
      return { text, tw, isAct };
    });

    const totalW = items.reduce((acc, it) => acc + it.tw, 0) + (items.length - 1) * gap;
    let x = cx - totalW / 2;

    items.forEach(it => {
      if (it.isAct) {
        // Cyan-to-Purple gradient
        const grad = ctx.createLinearGradient(x, baseY - fs, x + it.tw, baseY);
        grad.addColorStop(0, '#00F5FF');
        grad.addColorStop(0.5, '#7B61FF');
        grad.addColorStop(1, '#FF2E93');

        ctx.shadowColor = 'rgba(123, 97, 255, 0.85)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = grad;
        ctx.fillText(it.text, x, baseY - 2);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;
        ctx.fillText(it.text, x, baseY);
        ctx.shadowBlur = 0;
      }
      x += it.tw + gap;
    });
  }




  let cachedSegmentsRef = null;
  let cachedAllWords = [];

  function draw(style, ctx, canvas, segments, currentTime, options = {}) {
    window.__SUBZFREE_SEGMENTS__ = segments;
    if (segments !== cachedSegmentsRef) {
      cachedSegmentsRef = segments;
      cachedAllWords = segments.flatMap(s => s.words);
    }
    const allWords = cachedAllWords;
    const fn = STYLES[style] || classic;

    const scale = (options.scale !== undefined) ? options.scale : (window.__SUBZFREE_SCALE__ || 1.0);
    const yOffset = (options.yOffset !== undefined) ? options.yOffset : (window.__SUBZFREE_Y_OFFSET__ || 0);

    if (scale !== 1.0 || yOffset !== 0) {
      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height * (0.76 + yOffset);
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -canvas.height * 0.76);

      fn(ctx, canvas, allWords, currentTime);
      ctx.restore();
    } else {
      fn(ctx, canvas, allWords, currentTime);
    }
  }

  return { draw, STYLES: Object.keys(STYLES) };
})();
