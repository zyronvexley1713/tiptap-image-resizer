/**
 * useResize — इमेज resize हुक (Phase 1-4 implemented)
 * Custom hook for resizing the image using 8 directional handles.
 *
 * Phases implemented / लागू किए गए phases:
 * Phase 1: rotateDeltas() — माउस के dx/dy को image के local coordinate space में convert करता है
 *          Converts screen mouse deltas into image's rotated coordinate space.
 * Phase 2: DIR_REMAP — visual handle position को actual resize direction में remap करता है
 *          Remaps visual handle direction to actual resize direction based on rotation.
 * Phase 3: Container w/h swap — 90°/270° पर container dimensions swap होती हैं (ResizableImageComponent में)
 *          Container dimensions are swapped at 90°/270° in ResizableImageComponent.
 * Phase 4: getCursor() + getHandleDirs() — cursor भी rotation के साथ बदलता है
 *          Cursor changes dynamically based on actual resize direction after rotation.
 */

import { useRef, useCallback, useEffect } from 'react';

/** Resize direction type — 8 handles की directions */
export type Direction = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

interface UseResizeOptions {
  /** इमेज container का ref / Ref to image container div */
  containerRef: React.RefObject<HTMLDivElement>;
  /** इमेज की वर्तमान चौड़ाई / Current image width */
  curW: number;
  /** इमेज की वर्तमान ऊँचाई / Current image height */
  curH: number;
  /** इमेज का rotation angle (0/90/180/270) / Current rotation angle */
  rotate?: number;
  /** resize complete होने पर callback / Callback when resize is committed */
  onCommit: (w: number, h: number, ml: number, mt: number) => void;
  /** live resize के दौरान dimensions tooltip के लिए callback / Live dimensions callback */
  onResizing?: (w: number, h: number) => void;
}

/**
 * Phase 2: Handle visual position → actual resize direction mapping
 * Visual handle positions (screen corners) → actual image resize direction after rotation.
 *
 * Example at 90° CW:
 * Visual top-left (NW) → actually resizes SW of the image
 * Visual top-right (NE) → actually resizes NW of the image
 *
 *        0°              90° CW           180°            270° CW
 *   NW──N──NE         SW──S──SE        SE──S──SW        NE──N──NW
 *   │         │        │         │      │         │      │         │
 *   W    img  E   →   W    img  E   →  E    img  W   →  E    img  W
 *   │         │        │         │      │         │      │         │
 *   SW──S──SE         NW──N──NE        NE──N──NW        SE──S──SW
 */
const DIR_REMAP: Record<number, Record<Direction, Direction>> = {
    0: { nw:'nw', n:'n',  ne:'ne', w:'w',  e:'e',  sw:'sw', s:'s',  se:'se' },
   90: { nw:'sw', n:'w',  ne:'nw', w:'s',  e:'n',  sw:'se', s:'e',  se:'ne' },
  180: { nw:'se', n:'s',  ne:'sw', w:'e',  e:'w',  sw:'ne', s:'n',  se:'nw' },
  270: { nw:'ne', n:'e',  ne:'se', w:'n',  e:'s',  sw:'nw', s:'w',  se:'sw' },
};

/**
 * Visual direction को rotation angle के अनुसार actual direction में convert करता है
 * Maps visual handle direction to actual resize direction based on rotation angle.
 */
function remapDir(visualDir: Direction, angle: number): Direction {
  const normalized = ((angle % 360) + 360) % 360;
  return DIR_REMAP[normalized]?.[visualDir] ?? visualDir;
}

/**
 * Phase 1: Screen dx/dy को image के local coordinate space में transform करता है
 * Transforms screen mouse deltas into image's rotated coordinate space.
 *
 * rotate 0°:   rdx = dx,   rdy = dy   (कोई बदलाव नहीं / no change)
 * rotate 90°:  rdx = dy,  rdy = -dx  (screen-right = image-down)
 * rotate 180°: rdx = -dx, rdy = -dy  (सब उल्टा / everything inverted)
 * rotate 270°: rdx = -dy, rdy = dx   (screen-right = image-up)
 */
function rotateDeltas(dx: number, dy: number, angle: number): [number, number] {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 90)  return [ dy, -dx];
  if (normalized === 180) return [-dx, -dy];
  if (normalized === 270) return [-dy,  dx];
  return [dx, dy];
}

/**
 * Phase 4: Cursor mapping — actual resize direction के अनुसार cursor type
 * Maps actual resize direction to appropriate CSS cursor.
 */
const DIR_CURSOR: Record<Direction, string> = {
  n:  'ns-resize',
  s:  'ns-resize',
  e:  'ew-resize',
  w:  'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
};

/**
 * Visual direction और rotation से correct cursor निकालता है
 * Returns the correct resize cursor for a visual handle at a given rotation.
 */
function getCursor(visualDir: Direction, angle: number): string {
  return DIR_CURSOR[remapDir(visualDir, angle)];
}

/**
 * Handle की visual positions — ये fixed हैं, कभी नहीं बदलतीं
 * Base handle positions on screen — these never change regardless of rotation.
 * Cursor और actual direction runtime पर calculate होते हैं।
 */
const HANDLE_BASE: { dir: Direction; style: Omit<React.CSSProperties, 'cursor'> }[] = [
  { dir: 'nw', style: { top: -6, left: -6 } },
  { dir: 'n',  style: { top: -6, left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'ne', style: { top: -6, right: -6 } },
  { dir: 'w',  style: { top: '50%', left: -6, transform: 'translateY(-50%)' } },
  { dir: 'e',  style: { top: '50%', right: -6, transform: 'translateY(-50%)' } },
  { dir: 'sw', style: { bottom: -6, left: -6 } },
  { dir: 's',  style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'se', style: { bottom: -6, right: -6 } },
];

/**
 * Rotation के अनुसार correct cursor के साथ handles return करता है
 * Returns handle dirs with correct cursor for the given rotation angle.
 * Phase 4 — dynamic cursor based on rotation.
 */
export function getHandleDirs(rotate = 0): { dir: Direction; style: React.CSSProperties }[] {
  return HANDLE_BASE.map(({ dir, style }) => ({
    dir,
    style: { ...style, cursor: getCursor(dir, rotate) },
  }));
}

/** 0° के लिए static export (backward compatibility) / Static export for 0° */
export const HANDLE_DIRS = getHandleDirs(0);

export function useResize({ containerRef, curW, curH, rotate = 0, onCommit, onResizing }: UseResizeOptions) {
  const isResizing  = useRef(false);
  const activeDir   = useRef<Direction | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, ml: 0, mt: 0 });
  const shiftHeld   = useRef(false);
  const aspectRatio = useRef(1);

  /** rotate prop को ref में sync रखें ताकि closure stale न हो */
  const rotateRef = useRef(rotate);
  useEffect(() => { rotateRef.current = rotate; }, [rotate]);

  /**
   * Handle mousedown — resize शुरू करता है
   * Initiates resize on handle mousedown.
   * Phase 2: visual direction को actual direction में remap करता है।
   */
  const onHandleDown = useCallback(
    (e: React.MouseEvent, visualDir: Direction) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;

      // Phase 2: Visual dir → actual resize dir
      // Visual handle की position rotation के अनुसार actual direction में convert
      const actualDir = remapDir(visualDir, rotateRef.current);
      activeDir.current = actualDir;

      shiftHeld.current = e.shiftKey;

      const ml = parseFloat(containerRef.current?.style.marginLeft || '0');
      const mt = parseFloat(containerRef.current?.style.marginTop  || '0');
      const w  = containerRef.current?.offsetWidth  ?? curW;
      const h  = containerRef.current?.offsetHeight ?? curH;

      // Aspect ratio calculate करें (Shift lock के लिए) / Calculate for shift-lock
      aspectRatio.current = w / Math.max(h, 1);
      resizeStart.current = { x: e.clientX, y: e.clientY, w, h, ml, mt };
    },
    [containerRef, curW, curH]
  );

  useEffect(() => {
    /** Shift key को track करें resize के दौरान / Track shift key during resize */
    const onShift = (e: KeyboardEvent) => { shiftHeld.current = e.shiftKey; };
    window.addEventListener('keydown', onShift);
    window.addEventListener('keyup',   onShift);

    const onMove = (e: MouseEvent) => {
      if (!isResizing.current || !activeDir.current || !containerRef.current) return;

      const dir = activeDir.current;

      // Phase 1: Screen mouse delta को image coordinate space में rotate करें
      // Transform screen deltas into image's local coordinate space
      const screenDx = e.clientX - resizeStart.current.x;
      const screenDy = e.clientY - resizeStart.current.y;
      const [dx, dy] = rotateDeltas(screenDx, screenDy, rotateRef.current);

      let nw = resizeStart.current.w;
      let nh = resizeStart.current.h;
      let ml = resizeStart.current.ml;
      let mt = resizeStart.current.mt;

      // Direction के अनुसार width/height calculate करें
      // Calculate new dimensions based on drag direction
      if (dir === 'e' || dir === 'ne' || dir === 'se') nw = resizeStart.current.w + dx;
      if (dir === 'w' || dir === 'nw' || dir === 'sw') { nw = resizeStart.current.w - dx; ml = resizeStart.current.ml + dx; }
      if (dir === 's' || dir === 'se' || dir === 'sw') nh = resizeStart.current.h + dy;
      if (dir === 'n' || dir === 'ne' || dir === 'nw') { nh = resizeStart.current.h - dy; mt = resizeStart.current.mt + dy; }

      // Minimum size enforce करें / Enforce minimum dimensions
      nw = Math.max(60, Math.round(nw));
      nh = Math.max(40, Math.round(nh));

      // Shift = aspect ratio lock / Shift key से aspect ratio lock
      if (e.shiftKey || shiftHeld.current) {
        const ar = aspectRatio.current;
        if (dir === 'n' || dir === 's') {
          nw = Math.round(nh * ar);
        } else if (dir === 'e' || dir === 'w') {
          nh = Math.round(nw / ar);
        } else {
          // Corner handles — बड़े delta से decide करें / Use larger delta for corners
          if (Math.abs(nw - resizeStart.current.w) >= Math.abs(nh - resizeStart.current.h)) {
            nh = Math.round(nw / ar);
          } else {
            nw = Math.round(nh * ar);
          }
        }
      }

      // DOM apply करने से पहले editor boundary में clamp करें
      // Clamp dimensions within editor bounds BEFORE applying to DOM
      const editorEl = containerRef.current.closest('.ProseMirror') as HTMLElement | null;
      if (editorEl) {
        const es         = window.getComputedStyle(editorEl);
        const pl         = parseFloat(es.paddingLeft)  || 0;
        const pr         = parseFloat(es.paddingRight) || 0;
        const pt         = parseFloat(es.paddingTop)   || 0;
        const availableW = editorEl.clientWidth  - pl - pr;
        const availableH = editorEl.clientHeight - pt;

        // Width clamp
        const mlForClamp = Math.max(0, ml);
        const maxW = Math.max(60, availableW - mlForClamp);
        if (nw > maxW) {
          nw = maxW;
          if (dir === 'w' || dir === 'nw' || dir === 'sw') {
            ml = resizeStart.current.ml + (resizeStart.current.w - nw);
          }
        }
        if (nw > availableW) nw = availableW;

        // Height clamp — ऊपर की boundary / Top boundary clamp
        const mtForClamp = Math.max(0, mt);
        const maxH = Math.max(40, availableH - mtForClamp);
        if (nh > maxH) {
          nh = maxH;
          if (dir === 'n' || dir === 'nw' || dir === 'ne') {
            mt = resizeStart.current.mt + (resizeStart.current.h - nh);
          }
        }
        if (mt < 0) { nh = Math.max(40, nh + mt); mt = 0; }
        if (ml < 0) { nw = Math.max(60, nw + ml); ml = 0; }
      }

      // DOM में apply करें / Apply to DOM
      containerRef.current.style.width      = `${nw}px`;
      containerRef.current.style.height     = `${nh}px`;
      containerRef.current.style.marginLeft = `${ml}px`;
      containerRef.current.style.marginTop  = `${mt}px`;

      // Live tooltip के लिए dimensions emit करें / Emit for live tooltip
      onResizing?.(nw, nh);
    };

    /**
     * Resize complete होने पर Tiptap attrs update करता है
     * Commits final resize dimensions to Tiptap node attrs on mouse up.
     */
    const onUp = () => {
      if (!isResizing.current || !containerRef.current) return;
      const w  = containerRef.current.offsetWidth;
      const h  = containerRef.current.offsetHeight;
      const ml = parseFloat(containerRef.current.style.marginLeft || '0');
      const mt = parseFloat(containerRef.current.style.marginTop  || '0');
      onCommit(w, h, ml, mt);
      onResizing?.(0, 0); // tooltip hide करें / Hide tooltip
      isResizing.current = false;
      activeDir.current  = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('keydown',   onShift);
      window.removeEventListener('keyup',     onShift);
    };
  }, [containerRef, onCommit, onResizing]);

  return { onHandleDown };
}
