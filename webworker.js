// worker.js — processes images into pixelated frames and builds 4x4 block dictionary 
self.onmessage = async (e) => { try { const {type, payload} = e.data; if (type === 'PROCESS') { const {images, options, blockSize} = payload; const results = []; let dict = {}; for (const meta of images) { const {index, width, height} = meta; const src = new Uint8ClampedArray(meta.buffer); const out = new Uint8ClampedArray(src.length); const tmp = new Uint8ClampedArray(src.length); tmp.set(src);

if (options.grayscale) {
      for (let i = 0; i < tmp.length; i += 4) {
        const r = tmp[i], g = tmp[i+1], b = tmp[i+2];
        const l = Math.round(0.299*r + 0.587*g + 0.114*b);
        tmp[i] = tmp[i+1] = tmp[i+2] = l;
      }
    }
    if (options.dither && options.grayscale) {
      for (let i = 0; i < tmp.length; i += 4) {
        const v = tmp[i] > 128 ? 255 : 0;
        tmp[i] = tmp[i+1] = tmp[i+2] = v;
      }
    }

    const w = width, h = height, bs = blockSize;
    for (let by = 0; by < h; by += bs) {
      for (let bx = 0; bx < w; bx += bs) {
        let rsum = 0, gsum = 0, bsum = 0, cnt = 0;
        const byEnd = Math.min(by + bs, h);
        const bxEnd = Math.min(bx + bs, w);
        for (let yy = by; yy < byEnd; yy++) {
          const rowBase = yy * w;
          for (let xx = bx; xx < bxEnd; xx++) {
            const idx = (rowBase + xx) * 4;
            rsum += tmp[idx]; gsum += tmp[idx+1]; bsum += tmp[idx+2]; cnt++;
          }
        }
        const ravg = Math.round(rsum / cnt);
        const gavg = Math.round(gsum / cnt);
        const bavg = Math.round(bsum / cnt);
        for (let yy = by; yy < byEnd; yy++) {
          const rowBase = yy * w;
          for (let xx = bx; xx < bxEnd; xx++) {
            const idx = (rowBase + xx) * 4;
            out[idx] = ravg; out[idx+1] = gavg; out[idx+2] = bavg; out[idx+3] = tmp[idx+3];
          }
        }
      }
    }

    // If blockSize == 1 (final frame), build 4x4 dictionary for this image
    if (blockSize === 1) {
      // iterate 4x4 tiles across the image
      const tile = 4;
      for (let ty = 0; ty < h; ty += tile) {
        for (let tx = 0; tx < w; tx += tile) {
          let rsum=0, gsum=0, bsum=0, cnt=0;
          const tyEnd = Math.min(ty+tile, h);
          const txEnd = Math.min(tx+tile, w);
          for (let yy=ty; yy<tyEnd; yy++){
            const rowBase = yy * w;
            for (let xx=tx; xx<txEnd; xx++){
              const idx = (rowBase + xx) * 4;
              rsum += out[idx]; gsum += out[idx+1]; bsum += out[idx+2]; cnt++;
            }
          }
          const ravg = Math.round(rsum/cnt);
          const gavg = Math.round(gsum/cnt);
          const bavg = Math.round(bsum/cnt);
          // quantize to 4-bit per channel (0..15) to reduce signature space
          const rq = Math.round(ravg / 16);
          const gq = Math.round(gavg / 16);
          const bq = Math.round(bavg / 16);
          const sig = `${rq.toString(16)}${gq.toString(16)}${bq.toString(16)}`; // 3-hex nibble signature
          dict[sig] = (dict[sig] || 0) + 1;
        }
      }
    }

    results.push({index, width, height, buffer: out.buffer});
  }
  // Transfer buffers back and send dictionary
  const transfers = results.map(r => r.buffer);
  self.postMessage({type:'FRAME', blockSize, results, dict}, transfers);
}

} catch (err) { self.postMessage({type:'ERROR', message: String(err)}); } };

