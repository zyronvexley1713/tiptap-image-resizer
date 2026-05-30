/**
 * FilterPanel — फ़िल्टर functions और types
 * Filter utilities, Photon WASM integration, presets, and slider config.
 *
 * यह file sirf functions/types export करती है — UI WorkspaceEditor में है।
 * This file only exports functions/types. UI lives in WorkspaceEditor.
 *
 * Exports / निर्यात:
 * - FilterState: सभी filter values का type
 * - DEFAULT_FILTERS: default filter values
 * - loadPhoton(): Photon WASM singleton loader
 * - applyPhotonFilters(): CSS filters को pixels में bake करता है
 * - applyFlipRotate(): canvas 2D से flip/rotate बेक करता है
 * - applyWatermark(): canvas 2D से watermark text bake करता है
 * - FILTER_PRESETS: preset definitions (Normal, Vivid, B&W आदि)
 * - applyPreset(): preset को FilterState में convert करता है
 * - FILTER_SLIDERS: slider configuration array
 */

'use client';

/**
 * FilterState — सभी CSS filter values
 * All CSS filter properties stored as node attributes.
 */
export interface FilterState {
  /** चमक (0-200%) / Brightness percentage */
  brightness: number;
  /** कंट्रास्ट (0-200%) / Contrast percentage */
  contrast:   number;
  /** संतृप्ति (0-200%) / Saturation percentage */
  saturate:   number;
  /** धुंधलापन (0-20px) / Blur in pixels */
  blur:       number;
  /** श्वेत-श्याम (0-100%) / Grayscale percentage */
  grayscale:  number;
  /** सेपिया (0-100%) / Sepia percentage */
  sepia:      number;
  /** रंग घुमाव (0-360°) / Hue rotation in degrees */
  hueRotate:  number;
  /** रंग पलटना (0-100%) / Invert percentage */
  invert:     number;
}

/** Default filter state — सब neutral / All filters at neutral values */
export const DEFAULT_FILTERS: FilterState = {
  brightness: 100, contrast: 100, saturate: 100, blur: 0,
  grayscale: 0, sepia: 0, hueRotate: 0, invert: 0,
};

// ── Photon WASM Singleton Loader ──────────────────────────────────────────────
/**
 * Photon module singleton — एक बार load होता है, बार-बार नहीं
 * Singleton: Photon WASM loads once and is reused for all operations.
 */
let photonModule: typeof import('@silvia-odwyer/photon') | null = null;
let photonLoading = false;
const photonCallbacks: Array<() => void> = [];

/**
 * Photon WASM module load करता है (singleton pattern)
 * Loads and initializes the Photon WASM module.
 * Multiple concurrent calls wait for the same load — no double-init.
 */
export async function loadPhoton() {
  if (photonModule) return photonModule;
  if (photonLoading) {
    // पहले से load हो रहा है — wait करें / Already loading, wait for it
    return new Promise<typeof import('@silvia-odwyer/photon')>((res) => {
      photonCallbacks.push(() => res(photonModule!));
    });
  }
  photonLoading = true;
  const mod = await import('@silvia-odwyer/photon');
  await mod.default(); // WASM initialize करें / Initialize WASM
  photonModule = mod;
  photonCallbacks.forEach((cb) => cb());
  photonCallbacks.length = 0;
  return mod;
}

/**
 * CSS filters को Photon WASM से pixels में bake करता है
 * Applies CSS filter values to image pixels using Photon WASM.
 * यह destructive operation है — undo से वापस जाया जा सकता है।
 * This is destructive — use undo to revert.
 *
 * Process: src URL → canvas → PhotonImage → filters apply → new dataURL
 */
export async function applyPhotonFilters(
    src: string,
    filters: FilterState
): Promise<string> {
  const photon = await loadPhoton();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Canvas को PhotonImage में convert करें / Convert canvas to PhotonImage
        let pImg = photon.open_image(canvas, ctx);

        // Brightness — channel offset से / Via channel value offset
        if (filters.brightness !== 100) {
          const offset = Math.round((filters.brightness - 100) * 1.28);
          photon.alter_channel(pImg, 0, offset); // Red
          photon.alter_channel(pImg, 1, offset); // Green
          photon.alter_channel(pImg, 2, offset); // Blue
        }

        // Saturation — HSL space में / In HSL color space
        if (filters.saturate !== 100) {
          const level = (filters.saturate - 100) / 100;
          if (level > 0) photon.saturate_hsl(pImg, level);
          else photon.desaturate_hsl(pImg, Math.abs(level));
        }

        // Hue rotation — HSL space में / In HSL color space
        if (filters.hueRotate !== 0) {
          photon.hue_rotate_hsl(pImg, filters.hueRotate / 360);
        }

        // Grayscale — पूरा या partial / Full or partial grayscale
        if (filters.grayscale > 0) {
          if (filters.grayscale >= 90) photon.grayscale(pImg);
          else photon.desaturate_hsl(pImg, filters.grayscale / 100);
        }

        // Sepia — warm brown tone
        if (filters.sepia > 0) photon.sepia(pImg);

        // Gaussian blur — pixels smoothen करता है
        if (filters.blur > 0) {
          photon.gaussian_blur(pImg, Math.max(1, Math.round(filters.blur)));
        }

        // Invert — सभी colors पलटता है / Inverts all color values
        if (filters.invert > 0) photon.invert(pImg);

        // Processed image canvas पर वापस डालें / Put processed image back to canvas
        photon.putImageData(canvas, ctx, pImg);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) { reject(err); }
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Canvas 2D से flip और rotate bake करता है
 * Applies flip and rotation to image using Canvas 2D transforms.
 *
 * Photon के बजाय Canvas 2D use किया — ज़्यादा reliable और synchronous।
 * Uses Canvas 2D instead of Photon — more reliable for geometric transforms.
 *
 * 90°/270° पर canvas dimensions swap होती हैं।
 * Canvas dimensions are swapped for 90°/270° rotations.
 */
export async function applyFlipRotate(
    src: string,
    flipH: boolean,
    flipV: boolean,
    rotate: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // 90°/270° पर output dimensions swap होती हैं
        // Swap output dimensions for orthogonal rotations
        const isRotated90 = rotate === 90 || rotate === 270;
        const outW = isRotated90 ? ih : iw;
        const outH = isRotated90 ? iw : ih;

        const canvas = document.createElement('canvas');
        canvas.width  = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d')!;

        ctx.save();
        // Center से transform करें / Transform from center point
        ctx.translate(outW / 2, outH / 2);

        // Rotation apply करें / Apply rotation
        if (rotate === 90)  ctx.rotate(Math.PI / 2);
        if (rotate === 180) ctx.rotate(Math.PI);
        if (rotate === 270) ctx.rotate(-Math.PI / 2);

        // Flip apply करें (scaleX/scaleY) / Apply flip transforms
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

        // Image center से draw करें / Draw image from center
        ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (err) { reject(err); }
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Canvas 2D से watermark text bake करता है
 * Bakes watermark text onto the image using Canvas 2D.
 * यह destructive operation है / This is destructive — use undo to revert.
 *
 * Text white color + black outline से maximum visibility / Max visibility on any background.
 */
export async function applyWatermark(
    src: string,
    text: string,
    /** opacity 0.1-1.0 / Watermark opacity */
    opacity: number,
    /** font size in pixels / Font size */
    fontSize: number,
    /** position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' */
    position: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      ctx.save();
      ctx.globalAlpha  = opacity;
      ctx.font         = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle    = '#ffffff';
      ctx.strokeStyle  = 'rgba(0,0,0,0.5)';
      ctx.lineWidth    = 2;

      // Text dimensions calculate करें / Calculate text dimensions
      const metrics = ctx.measureText(text);
      const tw  = metrics.width;
      const th  = fontSize;
      const pad = 16; // Edge से padding / Padding from edges

      // Position के अनुसार x,y calculate करें / Calculate x,y based on position
      let x = pad, y = canvas.height - pad;
      if (position === 'top-left')     { x = pad;                      y = th + pad; }
      if (position === 'top-right')    { x = canvas.width - tw - pad;  y = th + pad; }
      if (position === 'bottom-left')  { x = pad;                      y = canvas.height - pad; }
      if (position === 'bottom-right') { x = canvas.width - tw - pad;  y = canvas.height - pad; }
      if (position === 'center')       { x = (canvas.width - tw) / 2;  y = (canvas.height + th) / 2; }

      // Outline पहले (background visibility के लिए) / Stroke first for visibility
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      ctx.restore();
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Filter Presets ────────────────────────────────────────────────────────────

/** FilterPreset — एक preset का definition / Definition of a single filter preset */
export interface FilterPreset {
  /** Preset का नाम / Preset name */
  name:    string;
  /** Preset का emoji icon */
  emoji:   string;
  /** Partial filter values — undefined values DEFAULT_FILTERS से लेते हैं */
  filters: Partial<FilterState>;
}

/**
 * Built-in filter presets
 * यहाँ सिर्फ default values से अलग values define करते हैं।
 * Only define values that differ from DEFAULT_FILTERS.
 */
export const FILTER_PRESETS: FilterPreset[] = [
  { name: 'Normal',   emoji: '🖼',  filters: {} },
  { name: 'Vivid',    emoji: '🌈',  filters: { brightness: 110, saturate: 150, contrast: 110 } },
  { name: 'Matte',    emoji: '🌫',  filters: { brightness: 105, contrast: 85,  saturate: 80  } },
  { name: 'B&W',      emoji: '⬛',  filters: { grayscale: 100, contrast: 110 } },
  { name: 'Sepia',    emoji: '🟤',  filters: { sepia: 100, brightness: 105 } },
  { name: 'Vintage',  emoji: '📷',  filters: { sepia: 40, brightness: 105, contrast: 90, saturate: 85 } },
  { name: 'Cool',     emoji: '🧊',  filters: { hueRotate: 200, saturate: 110, brightness: 105 } },
  { name: 'Warm',     emoji: '🔥',  filters: { hueRotate: 30,  saturate: 120, brightness: 108 } },
  { name: 'Dramatic', emoji: '🎭',  filters: { contrast: 160, brightness: 90, saturate: 130  } },
  { name: 'Fade',     emoji: '👻',  filters: { brightness: 120, contrast: 75, saturate: 60   } },
  { name: 'Invert',   emoji: '🔀',  filters: { invert: 100 } },
];

/**
 * Preset को intensity के साथ FilterState में convert करता है
 * Converts a preset to a FilterState with interpolated intensity.
 *
 * intensity=100: full preset effect / पूरा preset effect
 * intensity=0:   no effect (DEFAULT_FILTERS) / कोई effect नहीं
 * intensity=50:  50% preset effect / आधा effect
 */
export function applyPreset(preset: FilterPreset, intensity = 100): FilterState {
  const base = { ...DEFAULT_FILTERS };
  const t = intensity / 100; // 0-1 interpolation factor

  for (const [k, v] of Object.entries(preset.filters)) {
    const key = k as keyof FilterState;
    const def = DEFAULT_FILTERS[key];
    // Default से preset value की तरफ interpolate करें
    // Interpolate from default toward preset value
    (base as Record<string, number>)[key] = def + (v - def) * t;
  }
  return base;
}

/**
 * Filter slider configuration — WorkspaceEditor में use होती है
 * Slider configuration array used to render filter sliders in WorkspaceEditor.
 */
export const FILTER_SLIDERS: {
  key:   keyof FilterState;
  label: string;
  min:   number;
  max:   number;
  unit:  string;
}[] = [
  { key: 'brightness', label: 'Brightness', min: 0,   max: 200, unit: '%'  },
  { key: 'contrast',   label: 'Contrast',   min: 0,   max: 200, unit: '%'  },
  { key: 'saturate',   label: 'Saturate',   min: 0,   max: 200, unit: '%'  },
  { key: 'grayscale',  label: 'Grayscale',  min: 0,   max: 100, unit: '%'  },
  { key: 'sepia',      label: 'Sepia',      min: 0,   max: 100, unit: '%'  },
  { key: 'hueRotate',  label: 'Hue',        min: 0,   max: 360, unit: '°'  },
  { key: 'invert',     label: 'Invert',     min: 0,   max: 100, unit: '%'  },
  { key: 'blur',       label: 'Blur',       min: 0,   max: 20,  unit: 'px' },
];
