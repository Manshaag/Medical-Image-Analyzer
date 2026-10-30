/* Medical Image Analyzer: deterministic, dependency-free image operations. */
(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function grayscale(rgba) {
    if (rgba.length % 4) throw new Error('Expected RGBA pixel data.');
    const out = new Uint8ClampedArray(rgba.length / 4);
    for (let i = 0; i < out.length; i++) {
      const alpha = rgba[4 * i + 3] / 255;
      out[i] = Math.round((0.2126 * rgba[4 * i] + 0.7152 * rgba[4 * i + 1] +
        0.0722 * rgba[4 * i + 2]) * alpha);
    }
    return out;
  }

  function region(width, height, box) {
    const b = box || { x: 0, y: 0, width, height };
    const x = clamp(Math.floor(b.x), 0, width - 1);
    const y = clamp(Math.floor(b.y), 0, height - 1);
    return { x, y, width: clamp(Math.floor(b.width), 1, width - x),
      height: clamp(Math.floor(b.height), 1, height - y) };
  }

  function statistics(pixels, width, height, box, threshold = 128) {
    if (width < 1 || height < 1 || pixels.length !== width * height)
      throw new Error('Pixel dimensions do not match.');
    const roi = region(width, height, box);
    const histogram = Array(256).fill(0);
    let total = 0, squares = 0, above = 0, min = 255, max = 0;
    for (let y = roi.y; y < roi.y + roi.height; y++) {
      for (let x = roi.x; x < roi.x + roi.width; x++) {
        const v = pixels[y * width + x];
        histogram[v]++; total += v; squares += v * v;
        above += v >= threshold ? 1 : 0;
        min = Math.min(min, v); max = Math.max(max, v);
      }
    }
    const count = roi.width * roi.height, mean = total / count;
    let entropy = 0;
    for (const n of histogram) if (n) { const p = n / count; entropy -= p * Math.log2(p); }
    return { roi, count, mean, standardDeviation: Math.sqrt(Math.max(0, squares / count - mean * mean)),
      min, max, entropy, aboveThresholdPercent: above / count * 100, histogram };
  }

  function windowPixels(pixels, center, width, invert = false) {
    const span = Math.max(1, width), lower = center - span / 2;
    return Uint8ClampedArray.from(pixels, v => {
      const value = clamp(Math.round((v - lower) / span * 255), 0, 255);
      return invert ? 255 - value : value;
    });
  }

  function sobel(pixels, width, height) {
    const out = new Uint8ClampedArray(pixels.length);
    // Replicate boundary pixels so a constant image has no artificial border.
    const at = (x, y) => pixels[clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const gx = -at(x-1,y-1) + at(x+1,y-1) - 2*at(x-1,y) + 2*at(x+1,y)
        - at(x-1,y+1) + at(x+1,y+1);
      const gy = -at(x-1,y-1) - 2*at(x,y-1) - at(x+1,y-1)
        + at(x-1,y+1) + 2*at(x,y+1) + at(x+1,y+1);
      out[y * width + x] = Math.min(255, Math.hypot(gx, gy) / 4);
    }
    return out;
  }

  function thresholdPixels(pixels, threshold) {
    return Uint8ClampedArray.from(pixels, v => v >= threshold ? 255 : 0);
  }

  function phantom(width = 512, height = 512) {
    const data = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const u = (x / width - 0.5) * 2, v = (y / height - 0.5) * 2;
      const r = (u / 0.72) ** 2 + (v / 0.86) ** 2;
      let value = 10 + 3 * Math.sin(x * 0.8 + y * 1.2);
      if (r < 1) value = 85 + 25 * (1 - r) + 8 * Math.cos(u * 30) * Math.sin(v * 24);
      if (r < 1 && r > 0.87) value = 205;
      if (((u + 0.24) / 0.16) ** 2 + ((v + 0.1) / 0.34) ** 2 < 1) value = 42;
      if (((u - 0.24) / 0.16) ** 2 + ((v + 0.1) / 0.34) ** 2 < 1) value = 54;
      if (((u - 0.31) / 0.08) ** 2 + ((v - 0.35) / 0.08) ** 2 < 1) value = 166;
      data[y * width + x] = value;
    }
    return data;
  }

  const api = { grayscale, region, statistics, windowPixels, sobel, thresholdPixels, phantom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ImageAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
