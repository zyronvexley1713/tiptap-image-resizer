// 'use client';
// import React, { useEffect, useRef, useState } from 'react';

// export interface FilterState {
//   brightness: number;
//   contrast: number;
//   saturate: number;
//   blur: number;
// }

// export const DEFAULT_FILTERS: FilterState = {
//   brightness: 100,
//   contrast: 100,
//   saturate: 100,
//   blur: 0,
// };

// interface FilterPanelProps {
//   filters: FilterState;
//   onChange: (key: keyof FilterState, val: number) => void;
//   onReset: () => void;
// }

// const SLIDERS: {
//   key: keyof FilterState;
//   label: string;
//   min: number;
//   max: number;
//   unit: string;
// }[] = [
//   { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
//   { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
//   { key: 'saturate', label: 'Saturate', min: 0, max: 200, unit: '%' },
//   { key: 'blur', label: 'Blur', min: 0, max: 20, unit: 'px' },
// ];

// // ── Photon WASM loader (singleton) ─────────────────────────────────────────
// let photonModule: typeof import('@silvia-odwyer/photon') | null = null;
// let photonLoading = false;
// const photonCallbacks: Array<() => void> = [];

// async function loadPhoton() {
//   if (photonModule) return photonModule;
//   if (photonLoading) {
//     return new Promise<typeof import('@silvia-odwyer/photon')>((res) => {
//       photonCallbacks.push(() => res(photonModule!));
//     });
//   }
//   photonLoading = true;
//   const mod = await import('@silvia-odwyer/photon');
//   await mod.default(); // init WASM
//   photonModule = mod;
//   photonCallbacks.forEach((cb) => cb());
//   photonCallbacks.length = 0;
//   return mod;
// }

// // ── Apply Photon filters to an img element → return new dataURL ───────────
// export async function applyPhotonFilters(
//   src: string,
//   filters: FilterState
// ): Promise<string> {
//   const photon = await loadPhoton();

//   return new Promise((resolve, reject) => {
//     const img = new Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => {
//       try {
//         const canvas = document.createElement('canvas');
//         canvas.width = img.naturalWidth;
//         canvas.height = img.naturalHeight;
//         const ctx = canvas.getContext('2d')!;
//         ctx.drawImage(img, 0, 0);

//         // Convert canvas → PhotonImage
//         let photonImg = photon.open_image(canvas, ctx);

//         // Apply each filter via Photon
//         if (filters.brightness !== 100) {
//           const offset = Math.round((filters.brightness - 100) * 1.28); // -128..+128
//           photon.alter_channel(photonImg, 0, offset);
//           photon.alter_channel(photonImg, 1, offset);
//           photon.alter_channel(photonImg, 2, offset);
//         }

//         if (filters.saturate !== 100) {
//           // Photon saturate: positive = increase, negative = decrease
//           const level = (filters.saturate - 100) / 100; // -1..+1
//           if (level > 0) photon.saturate_hsl(photonImg, level);
//           else photon.desaturate_hsl(photonImg, Math.abs(level));
//         }

//         if (filters.blur > 0) {
//           photon.gaussian_blur(
//             photonImg,
//             Math.max(1, Math.round(filters.blur))
//           );
//         }

//         // Put processed pixels back to canvas
//         photon.putImageData(canvas, ctx, photonImg);

//         // contrast via CSS on canvas (Photon doesn't have direct contrast)
//         // We output canvas dataURL and let CSS handle contrast
//         resolve(canvas.toDataURL('image/png'));
//       } catch (err) {
//         reject(err);
//       }
//     };
//     img.onerror = reject;
//     img.src = src;
//   });
// }

// export function FilterPanel({ filters, onChange, onReset }: FilterPanelProps) {
//   return (
//     <div
//       style={{
//         display: 'flex',
//         flexWrap: 'wrap',
//         alignItems: 'center',
//         gap: '12px 20px',
//         padding: '8px 12px',
//         background: '#1e293b',
//         borderRadius: 8,
//         color: '#e2e8f0',
//         fontSize: 12,
//         width: '100%',
//       }}
//     >
//       {SLIDERS.map(({ key, label, min, max, unit }) => (
//         <div
//           key={key}
//           style={{
//             display: 'flex',
//             alignItems: 'center',
//             gap: 8,
//             minWidth: 200,
//           }}
//         >
//           <span style={{ color: '#94a3b8', width: 70, flexShrink: 0 }}>
//             {label}
//           </span>
//           <input
//             type="range"
//             min={min}
//             max={max}
//             value={filters[key]}
//             onChange={(e) => onChange(key, parseFloat(e.target.value))}
//             style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
//           />
//           <span style={{ width: 40, textAlign: 'right', color: '#e2e8f0' }}>
//             {filters[key]}
//             {unit}
//           </span>
//         </div>
//       ))}
//       <button
//         onClick={onReset}
//         style={{
//           padding: '4px 12px',
//           background: '#334155',
//           border: 'none',
//           borderRadius: 4,
//           color: '#cbd5e1',
//           cursor: 'pointer',
//           fontSize: 11,
//         }}
//       >
//         ↺ Reset
//       </button>
//     </div>
//   );
// }

'use client';
import React from 'react';

export interface FilterState {
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  invert: number;
}

export const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
};

// ── Photon WASM loader ────────────────────────────────────────────────────────
let photonModule: typeof import('@silvia-odwyer/photon') | null = null;
let photonLoading = false;
const photonCallbacks: Array<() => void> = [];

export async function loadPhoton() {
  if (photonModule) return photonModule;
  if (photonLoading) {
    return new Promise<typeof import('@silvia-odwyer/photon')>((res) => {
      photonCallbacks.push(() => res(photonModule!));
    });
  }
  photonLoading = true;
  const mod = await import('@silvia-odwyer/photon');
  await mod.default();
  photonModule = mod;
  photonCallbacks.forEach((cb) => cb());
  photonCallbacks.length = 0;
  return mod;
}

// ── Apply Photon filters ──────────────────────────────────────────────────────
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
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        let pImg = photon.open_image(canvas, ctx);

        if (filters.brightness !== 100) {
          const offset = Math.round((filters.brightness - 100) * 1.28);
          photon.alter_channel(pImg, 0, offset);
          photon.alter_channel(pImg, 1, offset);
          photon.alter_channel(pImg, 2, offset);
        }
        if (filters.saturate !== 100) {
          const level = (filters.saturate - 100) / 100;
          if (level > 0) photon.saturate_hsl(pImg, level);
          else photon.desaturate_hsl(pImg, Math.abs(level));
        }
        if (filters.hueRotate !== 0) {
          photon.hue_rotate_hsl(pImg, filters.hueRotate / 360);
        }
        if (filters.grayscale > 0) {
          if (filters.grayscale >= 90) photon.grayscale(pImg);
          else photon.desaturate_hsl(pImg, filters.grayscale / 100);
        }
        if (filters.sepia > 0) {
          photon.sepia(pImg);
        }
        if (filters.blur > 0) {
          photon.gaussian_blur(pImg, Math.max(1, Math.round(filters.blur)));
        }
        if (filters.invert > 0) {
          photon.invert(pImg);
        }

        photon.putImageData(canvas, ctx, pImg);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Flip / Rotate via Photon ──────────────────────────────────────────────────
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
        const isRotated90 = rotate === 90 || rotate === 270;
        const outW = isRotated90 ? ih : iw;
        const outH = isRotated90 ? iw : ih;

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d')!;

        ctx.save();
        ctx.translate(outW / 2, outH / 2);

        if (rotate === 90) ctx.rotate(Math.PI / 2);
        if (rotate === 180) ctx.rotate(Math.PI);
        if (rotate === 270) ctx.rotate(-Math.PI / 2);

        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Watermark via Photon ──────────────────────────────────────────────────────
export async function applyWatermark(
  src: string,
  text: string,
  opacity: number,
  fontSize: number,
  position: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;

      const metrics = ctx.measureText(text);
      const tw = metrics.width;
      const th = fontSize;
      const pad = 16;

      let x = pad,
        y = canvas.height - pad;
      if (position === 'top-left') {
        x = pad;
        y = th + pad;
      }
      if (position === 'top-right') {
        x = canvas.width - tw - pad;
        y = th + pad;
      }
      if (position === 'bottom-left') {
        x = pad;
        y = canvas.height - pad;
      }
      if (position === 'bottom-right') {
        x = canvas.width - tw - pad;
        y = canvas.height - pad;
      }
      if (position === 'center') {
        x = (canvas.width - tw) / 2;
        y = (canvas.height + th) / 2;
      }

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
export interface FilterPreset {
  name: string;
  emoji: string;
  filters: Partial<FilterState>;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { name: 'Normal', emoji: '🖼', filters: {} },
  {
    name: 'Vivid',
    emoji: '🌈',
    filters: { brightness: 110, saturate: 150, contrast: 110 },
  },
  {
    name: 'Matte',
    emoji: '🌫',
    filters: { brightness: 105, contrast: 85, saturate: 80 },
  },
  { name: 'B&W', emoji: '⬛', filters: { grayscale: 100, contrast: 110 } },
  { name: 'Sepia', emoji: '🟤', filters: { sepia: 100, brightness: 105 } },
  {
    name: 'Vintage',
    emoji: '📷',
    filters: { sepia: 40, brightness: 105, contrast: 90, saturate: 85 },
  },
  {
    name: 'Cool',
    emoji: '🧊',
    filters: { hueRotate: 200, saturate: 110, brightness: 105 },
  },
  {
    name: 'Warm',
    emoji: '🔥',
    filters: { hueRotate: 30, saturate: 120, brightness: 108 },
  },
  {
    name: 'Dramatic',
    emoji: '🎭',
    filters: { contrast: 160, brightness: 90, saturate: 130 },
  },
  {
    name: 'Fade',
    emoji: '👻',
    filters: { brightness: 120, contrast: 75, saturate: 60 },
  },
  { name: 'Invert', emoji: '🔀', filters: { invert: 100 } },
];

export function applyPreset(
  preset: FilterPreset,
  intensity = 100
): FilterState {
  const base = { ...DEFAULT_FILTERS };
  const t = intensity / 100;
  for (const [k, v] of Object.entries(preset.filters)) {
    const key = k as keyof FilterState;
    const def = DEFAULT_FILTERS[key];
    (base as Record<string, number>)[key] = def + (v - def) * t;
  }
  return base;
}

// ── Slider config ─────────────────────────────────────────────────────────────
export const FILTER_SLIDERS: {
  key: keyof FilterState;
  label: string;
  min: number;
  max: number;
  unit: string;
}[] = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
  { key: 'saturate', label: 'Saturate', min: 0, max: 200, unit: '%' },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
  { key: 'hueRotate', label: 'Hue', min: 0, max: 360, unit: '°' },
  { key: 'invert', label: 'Invert', min: 0, max: 100, unit: '%' },
  { key: 'blur', label: 'Blur', min: 0, max: 20, unit: 'px' },
];
