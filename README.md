# Medical Image Analyzer

A browser-based image-processing workspace for inspecting grayscale images and comparing a selected region against the full image. Open an image, adjust its contrast, inspect edges or a threshold mask, and export the measurements.

This is an original application implementation created with AI assistance. It uses conventional image-processing algorithms, with no trained model or disease classifier.

## Run

Open **index.html** in a modern desktop browser. There is no build step, package installation, API key or server dependency.

Alternatively, serve the folder locally:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000>.

## Features

- **Original and processed views:** compare the input grayscale image with contrast windowing, inversion, Sobel edges or a binary threshold mask.
- **Region measurements:** draw a rectangle on the processed image or enter exact pixel coordinates using keyboard-accessible fields.
- **Intensity analysis:** mean, population standard deviation, range, entropy, histogram and percentage of pixels at or above the selected threshold.
- **Reproducible exports:** JSON includes the timestamp, dimensions, settings, selected region and histogram. Processed PNG exports exclude the region outline.
- **Synthetic sample:** a deterministic phantom provides a demonstration without downloading any patient images.
- **Local processing:** image pixels remain in the browser; there are no external scripts, analytics, network uploads or persistent image storage. JSON exports omit the source filename and image pixels.

## Demonstration

1. Open the application; the synthetic phantom loads automatically.
2. Choose **Sobel edges** to inspect intensity transitions.
3. Choose **Threshold mask** and adjust the intensity threshold.
4. Drag over the processed image, or enter X = 200, Y = 200, Width = 100 and Height = 100, then select **Measure region**.
5. Export a JSON report and the processed PNG.
6. Load a permitted local image to repeat the workflow.

## Methods and units

RGBA images are converted to grayscale with `0.2126 R + 0.7152 G + 0.0722 B`; transparency is composited onto black. These are display values, not calibrated radiological measurements. Images with a side longer than 1024 pixels are proportionally resized before analysis. Measurements and region coordinates always refer to the analyzed resolution.

Contrast display maps `center - width/2` to 0 and `center + width/2` to 255, with clipping. It is a generic display window, not the DICOM VOI LUT formula. Sobel uses a 3 × 3 operator with replicated boundary pixels; its magnitude is divided by 4 and clipped to 255. Masks use `intensity >= threshold`. Statistics always use the original grayscale data after any resize, regardless of the displayed processing mode. Entropy is Shannon entropy in bits from the 256-bin histogram.

## Scope and limitations

This is an educational prototype, **not a medical device or diagnostic tool**. It does not detect tumors, pneumonia or other conditions, provide probabilities, or make treatment recommendations. No clinical dataset, diagnostic accuracy or model performance is claimed. DICOM, Hounsfield units, 16-bit medical intensities, image stacks, physical pixel spacing and calibrated area measurements are not supported. Inputs are limited to PNG, JPEG, WebP and BMP, 12 MB and 40 million source pixels. Use de-identified teaching images. Exported PNGs may retain visible text from the source image.

## Tests

The numerical tests require Node.js with the built-in test runner (Node 18 or newer):

```sh
node --test analysis.test.js
```

The application itself does not require Node.js.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Accessible application interface |
| `styles.css` | Responsive image workspace |
| `analysis.js` | Pure numerical operations |
| `app.js` | Image loading, controls, canvas rendering and exports |
| `analysis.test.js` | Tests against known numerical fixtures |

## License

MIT. See [LICENSE](LICENSE).
