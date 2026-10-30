'use strict';
(() => {
  const A = ImageAnalysis, $ = id => document.getElementById(id);
  const original = $('original'), processed = $('processed');
  const settingsIds = ['center', 'width', 'threshold'];
  let pixels, imageWidth = 512, imageHeight = 512, roi = null, measurements;
  let sourceKind = 'synthetic', sourceDimensions = { width: 512, height: 512 };
  let requestId = 0, dragStart = null;
  const base = document.createElement('canvas');

  function status(message, error = false) {
    $('status').textContent = message;
    $('status').classList.toggle('error', error);
  }

  function settings() {
    return { mode: $('mode').value, center: +$('center').value, width: +$('width').value,
      threshold: +$('threshold').value, invert: $('invert').checked };
  }

  function drawGrayscale(canvas, data) {
    canvas.width = imageWidth; canvas.height = imageHeight;
    const ctx = canvas.getContext('2d'), image = ctx.createImageData(imageWidth, imageHeight);
    for (let i = 0; i < data.length; i++) {
      image.data[4*i] = image.data[4*i+1] = image.data[4*i+2] = data[i];
      image.data[4*i+3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }

  function drawProcessed() {
    const ctx = processed.getContext('2d');
    ctx.clearRect(0, 0, imageWidth, imageHeight);
    ctx.drawImage(base, 0, 0);
    if (roi) {
      ctx.strokeStyle = '#57ceb2'; ctx.lineWidth = Math.max(1, imageWidth / 250);
      ctx.strokeRect(roi.x + .5, roi.y + .5, Math.max(0, roi.width - 1), Math.max(0, roi.height - 1));
    }
  }

  function updateRegionFields() {
    const box = A.region(imageWidth, imageHeight, roi);
    for (const [id, value, max] of [['x',box.x,imageWidth-1],['y',box.y,imageHeight-1],
      ['w',box.width,imageWidth],['h',box.height,imageHeight]]) {
      $('roi-'+id).value = value; $('roi-'+id).max = max;
    }
  }

  function measure() {
    const s = settings();
    measurements = A.statistics(pixels, imageWidth, imageHeight, roi, s.threshold);
    $('mean').textContent = measurements.mean.toFixed(1);
    $('std').textContent = measurements.standardDeviation.toFixed(1);
    $('above').textContent = measurements.aboveThresholdPercent.toFixed(1) + '%';
    $('count').textContent = measurements.count.toLocaleString();
    $('range').textContent = `Range ${measurements.min}–${measurements.max}`;
    $('threshold-note').textContent = `Intensity ≥ ${s.threshold}`;
    $('entropy').textContent = `Entropy ${measurements.entropy.toFixed(2)} bits`;
    $('region-description').textContent = roi ? `${roi.width} × ${roi.height} px at (${roi.x}, ${roi.y})` : 'Whole image';
    const histogram = $('histogram'), ctx = histogram.getContext('2d');
    ctx.clearRect(0,0,histogram.width,histogram.height);
    const peak = Math.max(...measurements.histogram,1), bar = histogram.width / 256;
    measurements.histogram.forEach((count, i) => {
      const h = count / peak * (histogram.height - 6);
      ctx.fillStyle = i >= s.threshold ? '#165e9a' : '#a4bac9';
      ctx.fillRect(i * bar, histogram.height-h, Math.max(1,bar-1), h);
    });
    ctx.strokeStyle = '#c27524'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.threshold*bar,0); ctx.lineTo(s.threshold*bar,histogram.height); ctx.stroke();
    histogram.setAttribute('aria-label', `Intensity histogram for ${measurements.count} pixels; mean ${measurements.mean.toFixed(1)}, range ${measurements.min} to ${measurements.max}.`);
    updateRegionFields();
  }

  function render() {
    const s = settings();
    for (const id of settingsIds) $(id+'-value').textContent = $(id).value;
    const modeNames = { window: 'Contrast window', edges: 'Sobel edges', mask: 'Threshold mask' };
    $('mode-title').textContent = modeNames[s.mode];
    const output = s.mode === 'edges' ? A.sobel(pixels,imageWidth,imageHeight) :
      s.mode === 'mask' ? A.thresholdPixels(pixels,s.threshold) : A.windowPixels(pixels,s.center,s.width,s.invert);
    drawGrayscale(base,output);
    processed.width = imageWidth; processed.height = imageHeight;
    drawProcessed(); measure();
  }

  function resetSettings() {
    $('center').value = 128; $('width').value = 256; $('threshold').value = 128;
    $('invert').checked = false; $('mode').value = 'window';
  }

  function loadDemo() {
    requestId++; imageWidth = 512; imageHeight = 512; roi = null;
    pixels = A.phantom(); sourceKind = 'synthetic'; sourceDimensions = { width:512, height:512 };
    $('file').value = ''; $('source').textContent = 'Synthetic phantom · 512 × 512';
    $('resolution').textContent = '512 × 512 px'; resetSettings();
    drawGrayscale(original,pixels); render();
    status('Synthetic sample loaded. Select a region to explore its intensity distribution.');
  }

  async function loadFile(file) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) { status('Choose an image smaller than 12 MB.',true); return; }
    if (!/\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
      status('Choose a PNG, JPEG, WebP or BMP image. DICOM is not supported.',true); return;
    }
    const id = ++requestId, url = URL.createObjectURL(file), img = new Image();
    status('Opening image locally…');
    try {
      img.src = url; await img.decode();
      if (id !== requestId) return;
      if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 40000000)
        throw new Error('Choose an image with fewer than 40 million pixels.');
      const scale = Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight));
      const width = Math.max(1,Math.round(img.naturalWidth*scale));
      const height = Math.max(1,Math.round(img.naturalHeight*scale));
      const buffer = document.createElement('canvas'); buffer.width=width; buffer.height=height;
      const ctx = buffer.getContext('2d'); ctx.drawImage(img,0,0,width,height);
      const nextPixels = A.grayscale(ctx.getImageData(0,0,width,height).data);
      imageWidth=width; imageHeight=height; pixels=nextPixels; roi=null; sourceKind='local image';
      sourceDimensions = { width:img.naturalWidth, height:img.naturalHeight };
      $('source').textContent = `${file.name} · ${width} × ${height}`;
      $('resolution').textContent = `${width} × ${height} px`;
      resetSettings(); drawGrayscale(original,pixels); render();
      status(scale < 1 ? 'Image opened locally and resized to a maximum side of 1024 px. Measurements use resized pixels.' : 'Image opened locally. Measurements use original grayscale values.');
    } catch (err) {
      if (id === requestId) status(err.message.startsWith('Choose') ? err.message : 'This image could not be decoded. Try a valid PNG or JPEG.',true);
    } finally { URL.revokeObjectURL(url); }
  }

  const point = event => {
    const rect = processed.getBoundingClientRect();
    return { x:Math.max(0,Math.min(imageWidth-1,Math.floor((event.clientX-rect.left)/rect.width*imageWidth))),
      y:Math.max(0,Math.min(imageHeight-1,Math.floor((event.clientY-rect.top)/rect.height*imageHeight))) };
  };
  function dragBox(event) {
    const end = point(event);
    return A.region(imageWidth,imageHeight,{x:Math.min(dragStart.x,end.x),y:Math.min(dragStart.y,end.y),
      width:Math.abs(end.x-dragStart.x)+1,height:Math.abs(end.y-dragStart.y)+1});
  }
  processed.addEventListener('pointerdown',event => {
    if (event.button !== 0 || dragStart) return;
    dragStart=point(event); processed.setPointerCapture(event.pointerId);
  });
  processed.addEventListener('pointermove',event => {
    if (!dragStart) return;
    roi=dragBox(event); drawProcessed();
  });
  processed.addEventListener('pointerup',event => {
    if (!dragStart) return;
    roi=dragBox(event); dragStart=null;
    if (processed.hasPointerCapture(event.pointerId)) processed.releasePointerCapture(event.pointerId);
    drawProcessed(); measure(); status('Region measured using original grayscale intensities.');
  });
  processed.addEventListener('pointercancel',() => { dragStart=null; drawProcessed(); measure(); });
  processed.addEventListener('lostpointercapture',() => { if (dragStart) { dragStart=null; measure(); } });

  $('apply-roi').addEventListener('click',() => {
    const values = ['x','y','w','h'].map(id=>$('roi-'+id).valueAsNumber);
    if (!values.every(Number.isFinite) || values[2]<1 || values[3]<1) {
      status('Enter valid region coordinates and positive dimensions.',true); return;
    }
    roi=A.region(imageWidth,imageHeight,{x:values[0],y:values[1],width:values[2],height:values[3]});
    drawProcessed(); measure(); status('Region measured. Coordinates are clamped to the image boundaries.');
  });
  $('clear-roi').addEventListener('click',() => { roi=null; drawProcessed(); measure(); status('Measuring the whole image.'); });
  $('reset').addEventListener('click',() => { resetSettings(); render(); status('Processing reset. Your selected region is preserved.'); });
  $('demo').addEventListener('click',loadDemo);
  $('file').addEventListener('change',event=>loadFile(event.target.files[0]));
  for (const id of [...settingsIds,'mode','invert']) $(id).addEventListener('input',render);

  function download(blob,filename) {
    const a=document.createElement('a'),url=URL.createObjectURL(blob);
    a.href=url; a.download=filename; document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('report').addEventListener('click',() => {
    const report = { application:'Medical Image Analyzer',version:'1.0.0',createdAt:new Date().toISOString(),
      purpose:'Educational image processing; not for diagnosis',sourceKind,sourceDimensions,
      analyzedDimensions:{width:imageWidth,height:imageHeight},intensityUnits:'8-bit grayscale, not Hounsfield units',
      settings:settings(),measurementBasis:'original grayscale pixels after any resize',
      alphaHandling:'transparent pixels composited onto black',statistics:measurements };
    download(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),'medical-image-analysis.json');
    status('Report exported. Image pixels and the source filename are excluded.');
  });
  $('save-image').addEventListener('click',() => {
    // Export the processing result without the measurement rectangle.
    base.toBlob(blob=> { if (blob) { download(blob,'processed-image.png'); status('Processed PNG exported without the region outline.'); } },'image/png');
  });
  loadDemo();
})();
