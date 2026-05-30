/**
 * useImageCrop — इमेज क्रॉप हुक
 * Custom hook for non-destructive crop overlay and destructive crop apply.
 *
 * काम करने का तरीका / How it works:
 * - Crop overlay CSS से दिखता है (preview) — इमेज नहीं बदलती
 * - Apply पर canvas से इमेज actually crop होती है (destructive)
 * - Crop values fractions में store होती हैं (0-1) — pixels में नहीं
 *   Crop values are stored as fractions (0-1), not pixels.
 *
 * CropState format:
 *   l = left fraction to crop
 *   r = right fraction to crop
 *   t = top fraction to crop
 *   b = bottom fraction to crop
 */

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Crop handle type — कौन सा corner/edge drag हो रहा है
 * Which crop handle is being dragged.
 */
export type CropHandle = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;

/**
 * CropState — crop के चारों sides की fraction values (0-1)
 * Crop state storing fraction to remove from each side.
 */
export interface CropState {
  /** बाईं तरफ से crop fraction / Left crop fraction */
  l: number;
  /** दाईं तरफ से crop fraction / Right crop fraction */
  r: number;
  /** ऊपर से crop fraction / Top crop fraction */
  t: number;
  /** नीचे से crop fraction / Bottom crop fraction */
  b: number;
}

interface UseImageCropOptions {
  /** इमेज container का ref / Ref to image container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** इमेज का source URL / Image source URL */
  src: string;
  /** वर्तमान इमेज width / Current image width */
  curW: number;
  /** initial crop state (node attrs से) / Initial crop state from node attrs */
  initialCrop: CropState;
  /** crop apply होने पर callback / Callback when crop is applied */
  onCommit: (src: string, w: number, h: number) => void;
}

export function useImageCrop({
  containerRef, src, curW, initialCrop, onCommit,
}: UseImageCropOptions) {
  /** crop overlay दिख रहा है या नहीं / Whether crop overlay is visible */
  const [showCrop, setShowCrop] = useState(false);

  /** वर्तमान crop values / Current crop fraction values */
  const [crop, setCrop] = useState<CropState>(initialCrop);

  /**
   * Crop drag का state ref — कौन सा handle drag हो रहा है
   * Tracks which crop handle is being dragged and the drag start position.
   */
  const cropDrag = useRef<{
    handle: CropHandle;
    startX: number;
    startY: number;
    start: CropState;
  }>({ handle: null, startX: 0, startY: 0, start: { l: 0, r: 0, t: 0, b: 0 } });

  /**
   * Crop overlay खोलता है
   * Opens the crop overlay with given initial crop values.
   */
  const openCrop = useCallback((c: CropState) => {
    setCrop(c);
    setShowCrop(true);
  }, []);

  /**
   * Crop overlay बंद करता है (बिना apply किए)
   * Closes the crop overlay without applying changes.
   */
  const closeCrop = useCallback(() => setShowCrop(false), []);

  /**
   * Crop apply करता है — canvas से actually इमेज crop होती है
   * Applies the crop: draws cropped portion to canvas and commits new src.
   * यह destructive operation है — undo से वापस जाया जा सकता है।
   */
  const applyCrop = useCallback(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // Fraction को pixels में convert करें / Convert fractions to pixels
      const sx = Math.round(crop.l * iw);
      const sy = Math.round(crop.t * ih);
      const sw = Math.max(1, Math.round((1 - crop.l - crop.r) * iw));
      const sh = Math.max(1, Math.round((1 - crop.t - crop.b) * ih));

      // Canvas पर cropped region draw करें / Draw cropped region on canvas
      const canvas = document.createElement('canvas');
      canvas.width  = sw;
      canvas.height = sh;
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      // Display size calculate करें (aspect ratio maintain) / Maintain aspect ratio
      const newW = Math.min(curW, 800);
      const newH = Math.round(newW / (sw / sh));
      onCommit(canvas.toDataURL('image/png'), newW, newH);
      setShowCrop(false);
    };
    img.onerror = () => setShowCrop(false);
    img.src = src;
  }, [src, crop, curW, onCommit]);

  /**
   * Crop reset करता है — सभी values 0 हो जाती हैं
   * Resets crop to no-crop state (full image visible).
   */
  const resetCrop = useCallback(() => {
    setCrop({ l: 0, r: 0, t: 0, b: 0 });
    setShowCrop(false);
  }, []);

  /**
   * Crop overlay के handles को drag करने का logic
   * Mouse event handlers for dragging crop handles.
   * Fractions को 0-1 के बीच clamp किया जाता है।
   */
  useEffect(() => {
    if (!showCrop) return;

    const onMove = (e: MouseEvent) => {
      const d = cropDrag.current;
      if (!d.handle || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      // Mouse movement को fraction में convert करें / Convert mouse delta to fraction
      const dx = (e.clientX - d.startX) / rect.width;
      const dy = (e.clientY - d.startY) / rect.height;
      const s  = d.start;

      /** Minimum crop box size (5% of image) / Minimum crop region size */
      const MIN = 0.05;
      let { l, r, t, b } = s;

      if (d.handle === 'move') {
        // पूरा crop box move करें / Move entire crop box
        const bw = 1 - s.l - s.r;
        const bh = 1 - s.t - s.b;
        l = Math.max(0, Math.min(1 - bw, s.l + dx));
        r = Math.max(0, 1 - l - bw);
        t = Math.max(0, Math.min(1 - bh, s.t + dy));
        b = Math.max(0, 1 - t - bh);
      } else {

        if (d.handle === 'tl' || d.handle === 'bl') l = Math.max(0, Math.min(s.l - dx, 1 - s.r - MIN));
        if (d.handle === 'tr' || d.handle === 'br') r = Math.max(0, Math.min(s.r + dx, 1 - s.l - MIN));
        if (d.handle === 'tl' || d.handle === 'tr') t = Math.max(0, Math.min(s.t - dy, 1 - s.b - MIN));
        if (d.handle === 'bl' || d.handle === 'br') b = Math.max(0, Math.min(s.b + dy, 1 - s.t - MIN));

      }
      setCrop({ l, r, t, b });
    };

    const onUp = () => { cropDrag.current.handle = null; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [showCrop, containerRef]);

  return { showCrop, crop, setCrop, cropDrag, openCrop, closeCrop, applyCrop, resetCrop };
}
