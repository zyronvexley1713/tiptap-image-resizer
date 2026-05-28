import { useRef, useState, useCallback, useEffect } from 'react';

export type CropHandle = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;

export interface CropState {
  l: number;
  r: number;
  t: number;
  b: number;
}

interface UseImageCropOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  src: string;
  curW: number;
  initialCrop: CropState;
  onCommit: (src: string, w: number, h: number) => void;
}

export function useImageCrop({
  containerRef,
  src,
  curW,
  initialCrop,
  onCommit,
}: UseImageCropOptions) {
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState<CropState>(initialCrop);

  const cropDrag = useRef<{
    handle: CropHandle;
    startX: number;
    startY: number;
    start: CropState;
  }>({ handle: null, startX: 0, startY: 0, start: { l: 0, r: 0, t: 0, b: 0 } });

  const openCrop = useCallback((c: CropState) => {
    setCrop(c);
    setShowCrop(true);
  }, []);
  const closeCrop = useCallback(() => setShowCrop(false), []);

  const applyCrop = useCallback(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const iw = img.naturalWidth,
        ih = img.naturalHeight;
      const sx = Math.round(crop.l * iw);
      const sy = Math.round(crop.t * ih);
      const sw = Math.max(1, Math.round((1 - crop.l - crop.r) * iw));
      const sh = Math.max(1, Math.round((1 - crop.t - crop.b) * ih));
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const newW = Math.min(curW, 800);
      const newH = Math.round(newW / (sw / sh));
      onCommit(canvas.toDataURL('image/png'), newW, newH);
      setShowCrop(false);
    };
    img.onerror = () => setShowCrop(false);
    img.src = src;
  }, [src, crop, curW, onCommit]);

  const resetCrop = useCallback(() => {
    setCrop({ l: 0, r: 0, t: 0, b: 0 });
    setShowCrop(false);
  }, []);

  // Crop drag mouse events
  useEffect(() => {
    if (!showCrop) return;
    const onMove = (e: MouseEvent) => {
      const d = cropDrag.current;
      if (!d.handle || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = (e.clientX - d.startX) / rect.width;
      const dy = (e.clientY - d.startY) / rect.height;
      const s = d.start;
      const MIN = 0.05;
      let { l, r, t, b } = s;

      if (d.handle === 'move') {
        const bw = 1 - s.l - s.r,
          bh = 1 - s.t - s.b;
        l = Math.max(0, Math.min(1 - bw, s.l + dx));
        r = Math.max(0, 1 - l - bw);
        t = Math.max(0, Math.min(1 - bh, s.t + dy));
        b = Math.max(0, 1 - t - bh);
      } else {
        if (d.handle === 'tl' || d.handle === 'bl')
          l = Math.max(0, Math.min(s.l + dx, 1 - s.r - MIN));
        if (d.handle === 'tr' || d.handle === 'br')
          r = Math.max(0, Math.min(s.r - dx, 1 - s.l - MIN));
        if (d.handle === 'tl' || d.handle === 'tr')
          t = Math.max(0, Math.min(s.t + dy, 1 - s.b - MIN));
        if (d.handle === 'bl' || d.handle === 'br')
          b = Math.max(0, Math.min(s.b - dy, 1 - s.t - MIN));
      }
      setCrop({ l, r, t, b });
    };
    const onUp = () => {
      cropDrag.current.handle = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [showCrop, containerRef]);

  return {
    showCrop,
    crop,
    setCrop,
    cropDrag,
    openCrop,
    closeCrop,
    applyCrop,
    resetCrop,
  };
}
