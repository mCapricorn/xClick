// A short reaction loop: RGB332 palette and bounded, nine-bit GIF LZW blocks.
// Clear before the dictionary reaches 512 entries so each literal stays nine bits.
(() => {
  function encodeFrame(rgba) {
    const packed = [];
    let bits = 0, count = 0;
    function code(n) {
      bits |= n << count;
      count += 9;
      while (count >= 8) { packed.push(bits & 255); bits >>>= 8; count -= 8; }
    }
    for (let i = 0; i < rgba.length; i += 4) {
      if (i % 1000 === 0) code(256);
      code((rgba[i] & 224) | ((rgba[i+1] & 224) >> 3) | (rgba[i+2] >> 6));
    }
    code(257);
    if (count) packed.push(bits & 255);
    const blocks = [8];
    for (let i = 0; i < packed.length; i += 255) {
      const block = packed.slice(i, i + 255);
      blocks.push(block.length, ...block);
    }
    return Uint8Array.from([...blocks, 0]);
  }
  function waitFor(video, event, action) {
    return new Promise((resolve, reject) => {
      const end = ok => {
        clearTimeout(timer);
        video.removeEventListener(event, ready);
        video.removeEventListener('error', failed);
        ok ? resolve() : reject(new Error('decode'));
      };
      const ready = () => end(true), failed = () => end(false);
      const timer = setTimeout(failed, 8000);
      video.addEventListener(event, ready);
      video.addEventListener('error', failed);
      action();
    });
  }
  globalThis.xClickReactionGif = async (file, current) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    const url = URL.createObjectURL(file);
    try {
      await waitFor(video, 'loadeddata', () => { video.src = url; });
      if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('decode');
      const scale = Math.min(1, 256 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      const w = canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      const h = canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const dimensions = [w & 255, w >> 8, h & 255, h >> 8];
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const palette = new Uint8Array(768);
      for (let i = 0; i < 256; i++) palette.set([(i >> 5)*255/7, ((i >> 2)&7)*255/7, (i&3)*85], i*3);
      const parts = ['GIF89a', Uint8Array.of(...dimensions, 247, 0, 0), palette, Uint8Array.of(33,255,11), 'NETSCAPE2.0', Uint8Array.of(3,1,0,0,0)];
      const frames = Math.ceil(Math.min(4, video.duration)*8);
      for (let n = 0; n < frames; n++) {
        if (!current()) throw new Error('stale');
        if (n) await waitFor(video, 'seeked', () => { video.currentTime = n/8; });
        context.drawImage(video, 0, 0, w, h);
        parts.push(Uint8Array.of(33,249,4,4, n%2 ? 12 : 13,0,0,0,44,0,0,0,0,...dimensions,0), encodeFrame(context.getImageData(0,0,w,h).data));
      }
      return new File([...parts, Uint8Array.of(59)], 'xclick-reaction.gif', { type:'image/gif' });
    } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
  };
})();
