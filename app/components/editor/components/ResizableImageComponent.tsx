/**
 * ResizableImageComponent — मुख्य इमेज node view कॉम्पोनेंट
 * The core React component rendered by Tiptap for each resizable image node.
 *
 * यह कॉम्पोनेंट Tiptap के NodeView system से render होता है।
 * This component is rendered by Tiptap's NodeView system via ReactNodeViewRenderer.
 *
 * Features / सुविधाएं:
 * - Resize (8 handles, Shift=aspect lock, rotate-aware phases 1-4)
 * - Drag (editor boundary clamped, caption sync)
 * - Crop overlay (non-destructive preview → destructive apply)
 * - Filters (CSS live preview + Photon bake)
 * - Flip / Rotate (native CSS transform)
 * - Watermark (canvas bake)
 * - Border / Shadow (CSS)
 * - Caption (editable)
 * - Undo/Redo (50 step history)
 * - Loading shimmer / Error state
 * - Context menu (right-click)
 * - Alt text editing
 *
 * Communication / संचार:
 * - Toolbar → Component: window CustomEvents (imageEditorAction, imageFilterChange)
 * - Component → Toolbar: window CustomEvents (imageSelectionChange, imageCropStateChange, imageStateSync)
 */

// 'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useResize, HANDLE_DIRS } from '../hooks/useResize';
import { useDrag } from '../hooks/useDrag';
import { useImageCrop } from '../hooks/useImageCrop';
import { useImageKeyboard } from '../hooks/useImageKeyboard';
import { useImageHistory } from '../hooks/useImageHistory';
import { CropPanel } from '../panels/CropPanel';
import {
  FilterState,
  DEFAULT_FILTERS,
  FILTER_PRESETS,
  applyPreset,
  applyPhotonFilters,
  applyWatermark,
} from '../panels/FilterPanel';
import { ImageCaption } from './ImageCaption';

/**
 * Helper — unknown value को number में convert करता है
 * Safely converts unknown value to number with fallback.
 */
const n = (v: unknown, fb: number) => {
  if (v === null || v === undefined) return fb;
  if (typeof v === 'number') return v;
  return parseFloat(v as string) || fb;
};

export default function ResizableImageComponent({
                                                  node,
                                                  updateAttributes,
                                                  selected,
                                                  deleteNode,
                                                  editor,
                                                }: NodeViewProps) {
  const {
    src, alt, width, height, align,
    dragX, dragY,
    cropL, cropR, cropT, cropB,
    filterBrightness, filterContrast, filterSaturate, filterBlur,
    filterGrayscale, filterSepia, filterHueRotate, filterInvert,
    borderRadius, borderWidth, borderColor, borderStyle, boxShadow,
    flipH, flipV, rotate,
  } = node.attrs;

  /** Container, wrapper, caption, file input refs */
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const captionRef   = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** इमेज की वर्तमान dimensions / Current image dimensions from node attrs */
  const curW = n(width, 320);
  const curH = n(height, 220);

  /** CSS filter values — live preview के लिए / For live CSS filter preview */
  const [filters, setFilters] = useState<FilterState>({
    brightness: n(filterBrightness, 100),
    contrast:   n(filterContrast, 100),
    saturate:   n(filterSaturate, 100),
    blur:       n(filterBlur, 0),
    grayscale:  n(filterGrayscale, 0),
    sepia:      n(filterSepia, 0),
    hueRotate:  n(filterHueRotate, 0),
    invert:     n(filterInvert, 0),
  });

  /** इमेज load/error state — shimmer और error UI के लिए */
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [imgError,   setImgError]   = useState(false);

  /** Live resize dimensions tooltip के लिए / For live W×H tooltip during resize */
  const [resizeDims, setResizeDims] = useState<{ w: number; h: number } | null>(null);

  /** Right-click context menu position / Context menu screen position */
  const [ctxMenu,    setCtxMenu]    = useState<{ x: number; y: number } | null>(null);

  /** Alt text edit mode / Alt text inline editing state */
  const [editingAlt, setEditingAlt] = useState(false);

  /** Photon/watermark processing overlay / Shows "Processing..." overlay */
  const [processing, setProcessing] = useState(false);

  const originalSrcRef = useRef<string | null>(null);

  // src change hone pe ref mein save karo (pehli baar ke liye)
  useEffect(() => {
    if (src && originalSrcRef.current === null) {
      originalSrcRef.current = src;
    }
  }, [src]);

  /** src बदलने पर load state reset करें / Reset load state when src changes */
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [src]);

    // src change hone pe — agar originalSrc nahi hai toh save karo
  useEffect(() => {
    if (src && !node.attrs.originalSrc) {
      queueMicrotask(() => {
        updateAttributes({ originalSrc: src });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── History ──────────────────────────────────────────────────────────────────
  /**
   * Image-specific undo/redo — Tiptap के built-in undo से अलग
   * Image-specific undo/redo history (separate from Tiptap's own undo).
   */
  const { snapshot, undo, redo } = useImageHistory({
    getAttrs:         () => ({ ...node.attrs }),
    updateAttributes: (attrs) => updateAttributes(attrs),
  });

  /**
   * History के साथ attrs update करता है
   * Updates attrs and takes a history snapshot before every change.
   */
  const commitWithHistory = useCallback(
      (attrs: Record<string, unknown>) => {
        snapshot();
        updateAttributes(attrs);
      },
      [snapshot, updateAttributes]
  );

  // ── Resize ──────────────────────────────────────────────────────────────────
  const { onHandleDown } = useResize({
    containerRef, curW, curH,
    onCommit:   (w, h, ml, mt) =>
        commitWithHistory({ width: w, height: h, marginLeft: ml, marginTop: mt }),
    onResizing: (w, h) => setResizeDims(w > 0 ? { w, h } : null),
  });

  // ── Crop ────────────────────────────────────────────────────────────────────
  const { showCrop, crop, setCrop, cropDrag, openCrop, closeCrop, applyCrop, resetCrop } =
      useImageCrop({
        containerRef, src, curW,
        initialCrop: { l: n(cropL,0), r: n(cropR,0), t: n(cropT,0), b: n(cropB,0) },
        onCommit: (newSrc, w, h) => {
          snapshot();
          updateAttributes({ src: newSrc, width: w, height: h, cropL:0, cropR:0, cropT:0, cropB:0 });
        },
      });

  // ── Drag ────────────────────────────────────────────────────────────────────
  const { onContainerMouseDown } = useDrag({
    containerRef, captionRef, selected, showCrop,
    dragX: n(dragX,0), dragY: n(dragY,0),
    onCommit: (dx, dy) => commitWithHistory({ dragX: dx, dragY: dy }),
  });

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useImageKeyboard({
    selected, showCrop,
    dragX: n(dragX,0), dragY: n(dragY,0), curW, curH, containerRef,
    onMove:       (dx, dy) => commitWithHistory({ dragX: dx, dragY: dy }),
    onResize:     (w, h)   => commitWithHistory({ width: w, height: h }),
    onDelete:     ()       => deleteNode(),
    onDeselect: () => {
      editor?.commands.setNodeSelection(editor.state.selection.from);
      editor?.commands.blur();
      const el = containerRef.current?.closest('.ProseMirror') as HTMLElement;
      el?.focus();
      editor?.chain().focus().run();
      const pos = editor?.state.selection.from;
      if (pos !== undefined) editor?.chain().setTextSelection(pos).run();
    },
    onCropCancel: closeCrop,
  });

  // ── Broadcasts ───────────────────────────────────────────────────────────────
  /**
   * Selection बदलने पर toolbar को notify करता है
   * Notifies toolbar of selection changes and syncs current filter/border state.
   */
  useEffect(() => {
    window.dispatchEvent(
        new CustomEvent('imageSelectionChange', { detail: { selected } })
    );
    if (selected) {
      // Toolbar को current filter/border state sync करें
      window.dispatchEvent(new CustomEvent('imageStateSync', {
        detail: {
          filters: {
            brightness: n(filterBrightness,100), contrast: n(filterContrast,100),
            saturate:   n(filterSaturate,100),   blur:      n(filterBlur,0),
            grayscale:  n(filterGrayscale,0),    sepia:     n(filterSepia,0),
            hueRotate:  n(filterHueRotate,0),    invert:    n(filterInvert,0),
          },
          border: {
            borderRadius: n(borderRadius,0), borderWidth: n(borderWidth,0),
            borderColor:  borderColor || '#000000',
            borderStyle:  borderStyle || 'solid',
            boxShadow:    boxShadow   || '',
          },
        },
      }));
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('imageCropStateChange', {
      detail: { active: showCrop, hasSelection: selected },
    }));
  }, [showCrop, selected]);

  // ── Menubar actions ──────────────────────────────────────────────────────────
  /**
   * Toolbar के CustomEvents सुनता है और actions execute करता है
   * Listens to toolbar CustomEvents and executes the corresponding action.
   */
  useEffect(() => {
    const handler = async (e: Event) => {
      if (!selected) return;
      const detail = (e as CustomEvent).detail ?? {};
      const action = detail.type;
      if (!action) return;

      // ── Undo / Redo ────────────────────────────────────────────────────────
      if (action === 'undo') { undo(); return; }
      if (action === 'redo') { redo(); return; }

      // ── Alignment — drag offset reset होता है / Reset drag on align ─────
      if (action === 'align-left')   commitWithHistory({ align:'left',   marginLeft:0, dragX:0, dragY:0 });
      if (action === 'align-center') commitWithHistory({ align:'center', marginLeft:0, dragX:0, dragY:0 });
      if (action === 'align-right')  commitWithHistory({ align:'right',  marginLeft:0, dragX:0, dragY:0 });

      // ── Caption alignment ──────────────────────────────────────────────────
      if (action === 'caption-align-left')   updateAttributes({ captionAlign:'left' });
      if (action === 'caption-align-center') updateAttributes({ captionAlign:'center' });
      if (action === 'caption-align-right')  updateAttributes({ captionAlign:'right' });

      // ── Crop ──────────────────────────────────────────────────────────────
      if (action === 'crop')         openCrop({ l:n(cropL,0), r:n(cropR,0), t:n(cropT,0), b:n(cropB,0) });
      if (action === 'crop-apply')   applyCrop();
      if (action === 'crop-reset')   resetCrop();
      if (action === 'crop-cancel')  closeCrop();
      if (action === 'image-replace') fileInputRef.current?.click();

      // ── Flip — CSS transform से (non-destructive) / Native CSS, non-destructive ──
      if (action === 'flip-h') updateAttributes({ flipH: !flipH });
      if (action === 'flip-v') updateAttributes({ flipV: !flipV });

      // ── Rotate CW — dims swap when crossing 90°/270° boundary ─────────────
      if (action === 'rotate-cw') {
        const current    = n(rotate, 0);
        const newRotate  = (current + 90) % 360;
        const isOrthogonal  = newRotate === 90 || newRotate === 270;
        const wasOrthogonal = current   === 90 || current   === 270;
        const shouldSwap    = isOrthogonal !== wasOrthogonal;
        commitWithHistory({
          rotate: newRotate,
          ...(shouldSwap ? { width: curH, height: curW } : {}),
        });
      }

      // ── Rotate CCW ────────────────────────────────────────────────────────
      if (action === 'rotate-ccw') {
        const current    = n(rotate, 0);
        const newRotate  = (current + 270) % 360;
        const isOrthogonal  = newRotate === 90 || newRotate === 270;
        const wasOrthogonal = current   === 90 || current   === 270;
        const shouldSwap    = isOrthogonal !== wasOrthogonal;
        commitWithHistory({
          rotate: newRotate,
          ...(shouldSwap ? { width: curH, height: curW } : {}),
        });
      }

      // ── Filter preset ──────────────────────────────────────────────────────
      if (action === 'filter-preset' && detail.preset) {
        const preset = FILTER_PRESETS.find((p) => p.name === detail.preset);
        if (preset) {
          const f = applyPreset(preset, detail.intensity ?? 100);
          setFilters(f);
          updateAttributes({
            filterBrightness: f.brightness, filterContrast: f.contrast,
            filterSaturate:   f.saturate,   filterBlur:     f.blur,
            filterGrayscale:  f.grayscale,  filterSepia:    f.sepia,
            filterHueRotate:  f.hueRotate,  filterInvert:   f.invert,
            filterPresetName: detail.preset,
          });
        }
      }

      // ── Apply Photon (destructive bake) ────────────────────────────────────
      if (action === 'filter-apply-photon' && src && detail.filters) {
        setProcessing(true);
        try {
          const newSrc = await applyPhotonFilters(src, detail.filters as FilterState);
          snapshot();
          updateAttributes({
            src: newSrc,
            filterBrightness:100, filterContrast:100, filterSaturate:100,
            filterBlur:0, filterGrayscale:0, filterSepia:0, filterHueRotate:0, filterInvert:0,
          });
          setFilters(DEFAULT_FILTERS);
        } catch (err) { console.error(err); }
        finally { setProcessing(false); }
      }

      // ── Filter reset ───────────────────────────────────────────────────────
      if (action === 'filter-reset') {
        setFilters(DEFAULT_FILTERS);
        updateAttributes({
          filterBrightness:100, filterContrast:100, filterSaturate:100,
          filterBlur:0, filterGrayscale:0, filterSepia:0, filterHueRotate:0, filterInvert:0,
        });
      }

      // ── Border ─────────────────────────────────────────────────────────────
      if (action === 'border-change' && detail.key) updateAttributes({ [detail.key]: detail.val });
      if (action === 'border-reset') {
        updateAttributes({ borderRadius:0, borderWidth:0, borderColor:'#000000', borderStyle:'solid', boxShadow:'' });
      }

      // ── Watermark (destructive canvas bake) ────────────────────────────────
      if (action === 'watermark-apply' && src && detail.text) {
        setProcessing(true);
        try {
          const newSrc = await applyWatermark(
              src,
              String(detail.text),
              Number(detail.opacity)  || 0.4,
              Number(detail.size)     || 24,
              String(detail.position  || 'bottom-right')
          );
          snapshot();
          updateAttributes({ src: newSrc });
        } catch (err) { console.error(err); }
        finally { setProcessing(false); }
      }

      if (action === 'reset-all') {
        const original = node.attrs.originalSrc || src;

        // Local filter state reset karo
        setFilters(DEFAULT_FILTERS);
        commitWithHistory({
          src: original, // ← original src restore
          // ── Dimensions ──────────────────────────
          width: 320, height: 220,
          // ── Alt text ────────────────────────────
          alt: '',
          // ── Position ────────────────────────────
          dragX: 0, dragY: 0, marginLeft: 0, marginTop: 0,
          align: 'center',
          // ── Transform ───────────────────────────
          flipH: false, flipV: false, rotate: 0,
          // ── Filters ─────────────────────────────
          filterBrightness: 100, filterContrast: 100,
          filterSaturate: 100,   filterBlur: 0,
          filterGrayscale: 0,    filterSepia: 0,
          filterHueRotate: 0,    filterInvert: 0,
          filterPresetName: 'Normal',
          // ── Crop ────────────────────────────────
          cropL: 0, cropR: 0, cropT: 0, cropB: 0,
          // ── Border / Shadow ──────────────────────
          borderRadius: 0, borderWidth: 0,
          borderColor: '#000000', borderStyle: 'solid',
          boxShadow: '',
          // ── Caption ─────────────────────────────
          caption: '', captionAlign: 'center',
        });
      }

    };

    window.addEventListener('imageEditorAction', handler);
    return () => window.removeEventListener('imageEditorAction', handler);
  }, [selected, updateAttributes, commitWithHistory, snapshot, undo, redo,
    openCrop, applyCrop, resetCrop, closeCrop,
    cropL, cropR, cropT, cropB, src, flipH, flipV, rotate]);

  // ── Filter slider live changes ────────────────────────────────────────────────
  /**
   * Slider drag के दौरान live CSS filter update करता है
   * Updates CSS filters in real-time as slider is dragged.
   */
  useEffect(() => {

    const handler = (e: Event) => {
      if (!selected) return;
      const { key, val } = (e as CustomEvent).detail ?? {};
      if (!key) return;
      setFilters((f) => ({ ...f, [key]: val }));
      queueMicrotask(() => {
        updateAttributes({ [`filter${key.charAt(0).toUpperCase()}${key.slice(1)}`]: val });
      });
    };
    window.addEventListener('imageFilterChange', handler);
    return () => window.removeEventListener('imageFilterChange', handler);
  }, [selected, updateAttributes]);

  /** External attr changes से filters sync करें / Sync filters from external attr changes */
  useEffect(() => {
    setFilters({
      brightness: n(filterBrightness,100), contrast: n(filterContrast,100),
      saturate:   n(filterSaturate,100),   blur:      n(filterBlur,0),
      grayscale:  n(filterGrayscale,0),    sepia:     n(filterSepia,0),
      hueRotate:  n(filterHueRotate,0),    invert:    n(filterInvert,0),
    });
  }, [filterBrightness, filterContrast, filterSaturate, filterBlur, // eslint-disable-line react-hooks/exhaustive-deps
    filterGrayscale, filterSepia, filterHueRotate, filterInvert]);

  // ── File upload ───────────────────────────────────────────────────────────────
  /** File picker से इमेज replace करता है / Replaces image from file picker */
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) { snapshot(); updateAttributes({ src: ev.target.result }); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [updateAttributes, snapshot]);

  // ── Context menu ──────────────────────────────────────────────────────────────
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (!selected) return;
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, [selected]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  // ── Image styles ──────────────────────────────────────────────────────────────
  const cl = n(cropL,0), cr2 = n(cropR,0), ct = n(cropT,0), cb = n(cropB,0);
  const hasCrop = cl>0||cr2>0||ct>0||cb>0;
  const scW = Math.max(0.01, 1-cl-cr2);
  const scH = Math.max(0.01, 1-ct-cb);

  /** CSS filter string — live preview के लिए / For live CSS filter preview */
  const filterStr = [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturate}%)`,
    filters.grayscale  > 0  ? `grayscale(${filters.grayscale}%)`        : '',
    filters.sepia      > 0  ? `sepia(${filters.sepia}%)`                : '',
    filters.hueRotate !== 0 ? `hue-rotate(${filters.hueRotate}deg)`     : '',
    filters.invert     > 0  ? `invert(${filters.invert}%)`              : '',
    filters.blur       > 0  ? `blur(${filters.blur}px)`                 : '',
  ].filter(Boolean).join(' ');

  const rot          = n(rotate, 0);
  const isOrthogonal = rot === 90 || rot === 270;

  /** Crop mode के लिए image style / Image style for crop mode */
  const imgStyle: React.CSSProperties = hasCrop
      ? {
        position: 'absolute',
        width:  `${100/scW}%`, height: `${100/scH}%`,
        left:   `${(-cl/scW)*100}%`, top: `${(-ct/scH)*100}%`,
        objectFit: 'fill', filter: filterStr,
        pointerEvents: 'none', userSelect: 'none',
      }
      : {
        width: '100%', height: '100%',
        objectFit: 'fill' as const, display: 'block',
        filter: filterStr, pointerEvents: 'none', userSelect: 'none',
      };

  /** Live resize dimensions — tooltip के लिए / For resize tooltip */
  const liveW = resizeDims?.w ?? curW;
  const liveH = resizeDims?.h ?? curH;

  /**
   * Rotating wrapper — image को container के center में rotate करता है
   * Inner wrapper that applies CSS rotation/flip transform.
   * 90°/270° पर width/height swap होती है ताकि image container fill करे।
   */
  const rotatingWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    // 90°/270° पर dimensions swap — image container fill करे
    width:  isOrthogonal ? `${liveH}px` : '100%',
    height: isOrthogonal ? `${liveW}px` : '100%',
    top: '50%', left: '50%',
    transformOrigin: 'center center',
    transform: [
      'translate(-50%, -50%)',
      rot    ? `rotate(${rot}deg)` : '',
      flipH  ? 'scaleX(-1)'        : '',
      flipV  ? 'scaleY(-1)'        : '',
    ].filter(Boolean).join(' '),
  };

  // ── Border style ──────────────────────────────────────────────────────────────
  const bw = n(borderWidth, 0);
  const containerBorder = bw > 0
      ? `${bw}px ${borderStyle || 'solid'} ${borderColor || '#000'}`
      : undefined;

  // ── Alignment ─────────────────────────────────────────────────────────────────
  const marginLeft = n(node.attrs.marginLeft, 0);
  const marginTop  = n(node.attrs.marginTop, 0);
  const wrapperW   = wrapperRef.current?.offsetWidth ?? 800;

  /** Alignment के अनुसार computed margin / Computed margin based on alignment */
  const computedMarginLeft = (() => {
    if (align === 'center') return Math.max(0, Math.round((wrapperW - curW) / 2));
    if (align === 'right')  return Math.max(0, wrapperW - curW);
    return marginLeft;
  })();

  return (
      <NodeViewWrapper style={{ display:'block', width:'100%', margin:'12px 0', lineHeight:0, overflow:'visible' }}>

        {/* Hidden file input — image replace के लिए / For image replace */}
        <input ref={fileInputRef} type="file" accept="image/*"
               style={{ display:'none' }} onChange={onFileChange} />

        <div ref={wrapperRef} style={{ display:'block', width:'100%', padding:'8px 0' }}>
          <div
              ref={containerRef}
              onMouseDown={onContainerMouseDown}
              onContextMenu={onContextMenu}
              style={{
                position: 'relative', display: 'inline-block',
                width:  `${curW}px`, height: `${curH}px`,
                marginLeft: `${computedMarginLeft}px`, marginTop: `${marginTop}px`,
                transform:  `translate(${n(dragX,0)}px,${n(dragY,0)}px)`,
                outline:    selected ? '2px solid #3b82f6' : '1px solid transparent',
                outlineOffset: '0px',
                borderRadius: `${n(borderRadius,0)}px`,
                border:    containerBorder,
                boxShadow: boxShadow || 'none',
                userSelect: 'none', overflow: 'visible',
                cursor: selected && !showCrop ? 'grab' : 'default',
              }}
          >
            {/* Image container — overflow hidden से border radius clip होता है */}
            <div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'inherit' }}>

              {/* Loading shimmer — image load हो रही है */}
              {!imgLoaded && !imgError && src && (
                  <div style={{
                    position:'absolute', inset:0,
                    background:'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                    backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#9ca3af', fontSize:12,
                  }}>Loading...</div>
              )}

              {/* Error state — image load fail */}
              {imgError && (
                  <div style={{
                    position:'absolute', inset:0, background:'#fef2f2',
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:8, color:'#ef4444', fontSize:12,
                  }}>
                    <span style={{ fontSize:24 }}>⚠️</span>
                    <span>Failed to load image</span>
                    <button
                        onMouseDown={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5',
                          borderRadius:4, cursor:'pointer', fontSize:11, color:'#b91c1c' }}>
                      Replace Image
                    </button>
                  </div>
              )}

              {/* Image with rotating wrapper — CSS transform से rotate/flip */}
              {src && (
                  <div style={rotatingWrapperStyle}>
                    <img
                        src={src} alt={alt||''} draggable={false}
                        style={{ ...imgStyle, opacity: imgLoaded ? 1 : 0, transition:'opacity 0.2s' }}
                        onLoad={() => setImgLoaded(true)}
                        onError={() => { setImgError(true); setImgLoaded(false); }}
                    />
                  </div>
              )}

              {/* No image placeholder */}
              {!src && (
                  <div style={{ width:'100%', height:'100%', background:'#f3f4f6',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, color:'#9ca3af' }}>No Image</div>
              )}
            </div>

            {/* Processing overlay — Photon/watermark operation चल रहा है */}
            {processing && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  borderRadius:'inherit', zIndex:500 }}>
                  <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>Processing...</div>
                </div>
            )}

            {/* Resize dimensions tooltip — resize के दौरान W×H दिखता है */}
            {resizeDims && (
                <div style={{
                  position:'absolute', top:-32, left:'50%', transform:'translateX(-50%)',
                  background:'rgba(15,15,15,0.85)', color:'#fff', fontSize:13, fontWeight:600,
                  padding:'4px 10px', borderRadius:6, pointerEvents:'none', whiteSpace:'nowrap',
                  zIndex:9999, fontFamily:'monospace', boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  {resizeDims.w} × {resizeDims.h}
                </div>
            )}

            {/* Alt text inline editor — image के ऊपर दिखता है */}
            {editingAlt && selected && (
                <div onMouseDown={(e) => e.stopPropagation()}
                     style={{ position:'absolute', top:-46, left:0, right:0, display:'flex', gap:4, zIndex:300 }}>
                  <input autoFocus type="text" placeholder="Alt text..."
                         defaultValue={alt||''}
                         onBlur={(e) => { updateAttributes({ alt: e.target.value }); setEditingAlt(false); }}
                         onKeyDown={(e) => {
                           if (e.key==='Enter') { updateAttributes({ alt:(e.target as HTMLInputElement).value }); setEditingAlt(false); }
                           if (e.key==='Escape') setEditingAlt(false);
                         }}
                         style={{ flex:1, padding:'4px 8px', fontSize:12, border:'1px solid #3b82f6',
                           borderRadius:4, background:'#fff', color:'#111', outline:'none',
                           boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}
                  />
                </div>
            )}

            {/* Crop overlay */}
            {showCrop && (
                <CropPanel crop={crop} setCrop={setCrop} cropDrag={cropDrag}
                           onApply={applyCrop} onReset={resetCrop} onCancel={closeCrop} />
            )}

            {/* Resize handles — 8 directional handles */}
            {selected && !showCrop && HANDLE_DIRS.map((h) => (
                <div key={h.dir} data-resize-handle="true"
                     onMouseDown={(e) => onHandleDown(e, h.dir)}
                     style={{
                       position:'absolute', width:12, height:12,
                       backgroundColor:'#3b82f6', border:'2px solid #fff',
                       borderRadius:'3px', boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
                       zIndex:60, ...h.style,
                     }}
                />
            ))}
          </div>

          {/* Caption — image के नीचे */}
          <ImageCaption
              ref={captionRef}
              caption={node.attrs.caption||''}
              selected={selected} curW={curW}
              captionAlign={node.attrs.captionAlign||'center'}
              marginLeft={computedMarginLeft}
              dragX={n(dragX,0)} dragY={n(dragY,0)}
              onChange={(val:string) => updateAttributes({ caption: val })}
          />
        </div>

        {/* Context menu — right-click पर दिखता है */}
        {ctxMenu && selected && (
            <div onMouseDown={(e) => e.stopPropagation()}
                 style={{ position:'fixed', left:ctxMenu.x, top:ctxMenu.y,
                   background:'#fff', border:'1px solid #e5e7eb', borderRadius:8,
                   boxShadow:'0 4px 20px rgba(0,0,0,0.15)', zIndex:9999,
                   minWidth:170, overflow:'hidden', fontSize:13 }}>
              {[
                { label:'Align Left',    action:'align-left'    },
                { label:'Align Center',  action:'align-center'  },
                { label:'Align Right',   action:'align-right'   },
                null,
                { label:'Crop',          action:'crop'          },
                { label:'Flip Horizontal', action:'flip-h'      },
                { label:'Rotate CW°',    action:'rotate-cw'     },
                { label:'Rotate CCW°',   action:'rotate-ccw'    },
                { label:'Replace Image', action:'image-replace' },
                { label:'Edit Alt Text', action:'edit-alt'      },
                null,
                { label:'Undo',          action:'undo'          },
                { label:'Redo',          action:'redo'          },
                null,
                { label:'Delete',        action:'delete', danger:true },
              ].map((item, i) =>
                  item === null ? (
                      <div key={i} style={{ height:1, background:'#f3f4f6', margin:'2px 0' }} />
                  ) : (
                      <button key={item.action}
                              onMouseDown={(e) => {
                                e.preventDefault(); e.stopPropagation(); setCtxMenu(null);
                                if (item.action==='delete')        { deleteNode(); return; }
                                if (item.action==='edit-alt')      { setEditingAlt(true); return; }
                                if (item.action==='image-replace') { fileInputRef.current?.click(); return; }
                                window.dispatchEvent(new CustomEvent('imageEditorAction', { detail: { type: item.action } }));
                              }}
                              style={{ display:'block', width:'100%', textAlign:'left',
                                padding:'8px 14px', background:'none', border:'none',
                                cursor:'pointer', color: item.danger ? '#ef4444' : '#111' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f9fafb')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >{item.label}</button>
                  )
              )}
            </div>
        )}

        <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
      </NodeViewWrapper>
  );
}