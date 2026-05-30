// ── Main extension ────────────────────────────────────────────────────────────
export { ResizableImage } from '../app/components/editor/extensions/ResizableImage';
export type { ResizableImageOptions } from '../app/components/editor/extensions/ResizableImage';

// ── Components ────────────────────────────────────────────────────────────────
export { default as ResizableImageComponent } from '../app/components/editor/components/ResizableImageComponent';
export { ImageCaption } from '../app/components/editor/components/ImageCaption';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useResize, HANDLE_DIRS, getHandleDirs } from '../app/components/editor/hooks/useResize';
export type { Direction } from '../app/components/editor/hooks/useResize';
export { useDrag } from '../app/components/editor/hooks/useDrag';
export { useImageCrop } from '../app/components/editor/hooks/useImageCrop';
export type { CropState, CropHandle } from '../app/components/editor/hooks/useImageCrop';
export { useImageHistory } from '../app/components/editor/hooks/useImageHistory';
export { useImageKeyboard } from '../app/components/editor/hooks/useImageKeyboard';

// ── Panels / Utilities ────────────────────────────────────────────────────────
export {
  DEFAULT_FILTERS,
  FILTER_PRESETS,
  FILTER_SLIDERS,
  applyPreset,
  applyPhotonFilters,
  applyFlipRotate,
  applyWatermark,
  loadPhoton,
} from '../app/components/editor/panels/FilterPanel';
export type { FilterState, FilterPreset } from '../app/components/editor/panels/FilterPanel';

export { BorderPanel, DEFAULT_BORDER } from '../app/components/editor/panels/BorderPanel';
export type { BorderState } from '../app/components/editor/panels/BorderPanel';

export { CropPanel } from '../app/components/editor/panels/CropPanel';
