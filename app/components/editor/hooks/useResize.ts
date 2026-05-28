// import { useRef, useCallback, useEffect } from 'react';

// export type Direction = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

// interface UseResizeOptions {
//   containerRef: React.RefObject<HTMLDivElement>;
//   curW: number;
//   curH: number;
//   onCommit: (w: number, h: number, ml: number, mt: number) => void;
// }

// export const HANDLE_DIRS: { dir: Direction; style: React.CSSProperties }[] = [
//   { dir: 'nw', style: { top: -6, left: -6, cursor: 'nwse-resize' } },
//   {
//     dir: 'n',
//     style: {
//       top: -6,
//       left: '50%',
//       transform: 'translateX(-50%)',
//       cursor: 'ns-resize',
//     },
//   },
//   { dir: 'ne', style: { top: -6, right: -6, cursor: 'nesw-resize' } },
//   {
//     dir: 'w',
//     style: {
//       top: '50%',
//       left: -6,
//       transform: 'translateY(-50%)',
//       cursor: 'ew-resize',
//     },
//   },
//   {
//     dir: 'e',
//     style: {
//       top: '50%',
//       right: -6,
//       transform: 'translateY(-50%)',
//       cursor: 'ew-resize',
//     },
//   },
//   { dir: 'sw', style: { bottom: -6, left: -6, cursor: 'nesw-resize' } },
//   {
//     dir: 's',
//     style: {
//       bottom: -6,
//       left: '50%',
//       transform: 'translateX(-50%)',
//       cursor: 'ns-resize',
//     },
//   },
//   { dir: 'se', style: { bottom: -6, right: -6, cursor: 'nwse-resize' } },
// ];

// export function useResize({
//   containerRef,
//   curW,
//   curH,
//   onCommit,
// }: UseResizeOptions) {
//   const isResizing = useRef(false);
//   const activeDir = useRef<Direction | null>(null);
//   const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, ml: 0, mt: 0 });

//   const onHandleDown = useCallback(
//     (e: React.MouseEvent, dir: Direction) => {
//       e.preventDefault();
//       e.stopPropagation();
//       isResizing.current = true;
//       activeDir.current = dir;

//       // marginLeft/marginTop directly containerRef se lo — flexbox nahi, direct style
//       const ml = parseFloat(containerRef.current?.style.marginLeft || '0');
//       const mt = parseFloat(containerRef.current?.style.marginTop || '0');

//       resizeStart.current = {
//         x: e.clientX,
//         y: e.clientY,
//         w: containerRef.current?.offsetWidth ?? curW,
//         h: containerRef.current?.offsetHeight ?? curH,
//         ml,
//         mt,
//       };
//     },
//     [containerRef, curW, curH]
//   );

//   useEffect(() => {
//     const onMove = (e: MouseEvent) => {
//       if (!isResizing.current || !activeDir.current || !containerRef.current)
//         return;

//       const dir = activeDir.current;
//       const dx = e.clientX - resizeStart.current.x;
//       const dy = e.clientY - resizeStart.current.y;

//       let nw = resizeStart.current.w;
//       let nh = resizeStart.current.h;
//       let ml = resizeStart.current.ml;
//       let mt = resizeStart.current.mt;

//       // Width calculation
//       if (dir === 'e' || dir === 'ne' || dir === 'se') {
//         nw = resizeStart.current.w + dx; // right side badhta hai — left fixed
//       }
//       if (dir === 'w' || dir === 'nw' || dir === 'sw') {
//         nw = resizeStart.current.w - dx; // left side badhta hai
//         ml = resizeStart.current.ml + dx; // left margin badh ke left anchor fix karta hai
//       }

//       // Height calculation
//       if (dir === 's' || dir === 'se' || dir === 'sw') {
//         nh = resizeStart.current.h + dy; // bottom side badhta hai — top fixed
//       }
//       if (dir === 'n' || dir === 'ne' || dir === 'nw') {
//         nh = resizeStart.current.h - dy; // top side badhta hai
//         mt = resizeStart.current.mt + dy; // top margin badh ke top anchor fix karta hai
//       }

//       nw = Math.max(60, Math.round(nw));
//       nh = Math.max(40, Math.round(nh));

//       containerRef.current.style.width = `${nw}px`;
//       containerRef.current.style.height = `${nh}px`;
//       containerRef.current.style.marginLeft = `${ml}px`;
//       containerRef.current.style.marginTop = `${mt}px`;
//     };

//     const onUp = () => {
//       if (!isResizing.current || !containerRef.current) return;
//       const w = containerRef.current.offsetWidth;
//       const h = containerRef.current.offsetHeight;
//       const ml = parseFloat(containerRef.current.style.marginLeft || '0');
//       const mt = parseFloat(containerRef.current.style.marginTop || '0');
//       onCommit(w, h, ml, mt);
//       isResizing.current = false;
//       activeDir.current = null;
//     };

//     window.addEventListener('mousemove', onMove);
//     window.addEventListener('mouseup', onUp);
//     return () => {
//       window.removeEventListener('mousemove', onMove);
//       window.removeEventListener('mouseup', onUp);
//     };
//   }, [containerRef, onCommit]);

//   return { onHandleDown };
// }

import { useRef, useCallback, useEffect } from 'react';

export type Direction = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

interface UseResizeOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  curW: number;
  curH: number;
  onCommit: (w: number, h: number, ml: number, mt: number) => void;
  onResizing?: (w: number, h: number) => void; // live dimensions callback
}

export const HANDLE_DIRS: { dir: Direction; style: React.CSSProperties }[] = [
  { dir: 'nw', style: { top: -6, left: -6, cursor: 'nwse-resize' } },
  {
    dir: 'n',
    style: {
      top: -6,
      left: '50%',
      transform: 'translateX(-50%)',
      cursor: 'ns-resize',
    },
  },
  { dir: 'ne', style: { top: -6, right: -6, cursor: 'nesw-resize' } },
  {
    dir: 'w',
    style: {
      top: '50%',
      left: -6,
      transform: 'translateY(-50%)',
      cursor: 'ew-resize',
    },
  },
  {
    dir: 'e',
    style: {
      top: '50%',
      right: -6,
      transform: 'translateY(-50%)',
      cursor: 'ew-resize',
    },
  },
  { dir: 'sw', style: { bottom: -6, left: -6, cursor: 'nesw-resize' } },
  {
    dir: 's',
    style: {
      bottom: -6,
      left: '50%',
      transform: 'translateX(-50%)',
      cursor: 'ns-resize',
    },
  },
  { dir: 'se', style: { bottom: -6, right: -6, cursor: 'nwse-resize' } },
];

export function useResize({
  containerRef,
  curW,
  curH,
  onCommit,
  onResizing,
}: UseResizeOptions) {
  const isResizing = useRef(false);
  const activeDir = useRef<Direction | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, ml: 0, mt: 0 });
  const shiftHeld = useRef(false);
  const aspectRatio = useRef(1);

  const onHandleDown = useCallback(
    (e: React.MouseEvent, dir: Direction) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      activeDir.current = dir;
      shiftHeld.current = e.shiftKey;

      const ml = parseFloat(containerRef.current?.style.marginLeft || '0');
      const mt = parseFloat(containerRef.current?.style.marginTop || '0');
      const w = containerRef.current?.offsetWidth ?? curW;
      const h = containerRef.current?.offsetHeight ?? curH;

      aspectRatio.current = w / Math.max(h, 1);

      resizeStart.current = { x: e.clientX, y: e.clientY, w, h, ml, mt };
    },
    [containerRef, curW, curH]
  );

  useEffect(() => {
    const onShift = (e: KeyboardEvent) => {
      shiftHeld.current = e.shiftKey;
    };
    window.addEventListener('keydown', onShift);
    window.addEventListener('keyup', onShift);

    const onMove = (e: MouseEvent) => {
      if (!isResizing.current || !activeDir.current || !containerRef.current)
        return;

      const dir = activeDir.current;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;

      let nw = resizeStart.current.w;
      let nh = resizeStart.current.h;
      let ml = resizeStart.current.ml;
      let mt = resizeStart.current.mt;

      if (dir === 'e' || dir === 'ne' || dir === 'se')
        nw = resizeStart.current.w + dx;
      if (dir === 'w' || dir === 'nw' || dir === 'sw') {
        nw = resizeStart.current.w - dx;
        ml = resizeStart.current.ml + dx;
      }
      if (dir === 's' || dir === 'se' || dir === 'sw')
        nh = resizeStart.current.h + dy;
      if (dir === 'n' || dir === 'ne' || dir === 'nw') {
        nh = resizeStart.current.h - dy;
        mt = resizeStart.current.mt + dy;
      }

      nw = Math.max(60, Math.round(nw));
      nh = Math.max(40, Math.round(nh));

      // Shift = aspect ratio lock
      if (e.shiftKey || shiftHeld.current) {
        const ar = aspectRatio.current;
        if (dir === 'n' || dir === 's') {
          nw = Math.round(nh * ar);
        } else if (dir === 'e' || dir === 'w') {
          nh = Math.round(nw / ar);
        } else {
          // Corner: use the larger delta
          const byW = Math.round(nw / ar);
          const byH = Math.round(nh * ar);
          if (
            Math.abs(nw - resizeStart.current.w) >=
            Math.abs(nh - resizeStart.current.h)
          ) {
            nh = byW;
          } else {
            nw = byH;
          }
        }
      }

      // ── Clamp BEFORE applying to DOM ─────────────────────────────────────
      // ── Clamp BEFORE applying to DOM ─────────────────────────────────────
      const editorEl = containerRef.current.closest(
        '.ProseMirror'
      ) as HTMLElement | null;
      if (editorEl) {
        const es = window.getComputedStyle(editorEl);
        const pl = parseFloat(es.paddingLeft) || 0;
        const pr = parseFloat(es.paddingRight) || 0;
        const pt = parseFloat(es.paddingTop) || 0;
        const availableW = editorEl.clientWidth - pl - pr;
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
        if (ml < 0) {
          nw = Math.max(60, nw + ml); // nw ko ml overshoot se reduce karo
          ml = 0;
        }

        // Height clamp — mt cannot push image above editor top
        const mtForClamp = Math.max(0, mt);
        const maxH = Math.max(40, availableH - mtForClamp);
        if (nh > maxH) {
          nh = maxH;
          if (dir === 'n' || dir === 'nw' || dir === 'ne') {
            mt = resizeStart.current.mt + (resizeStart.current.h - nh);
          }
        }
        // mt negative = image above editor top
        if (mt < 0) {
          nh = Math.max(40, nh + mt);
          mt = 0;
        }
      }

      // ── Apply to DOM ──────────────────────────────────────────────────────

      containerRef.current.style.width = `${nw}px`;
      containerRef.current.style.height = `${nh}px`;
      containerRef.current.style.marginLeft = `${ml}px`;
      containerRef.current.style.marginTop = `${mt}px`;

      onResizing?.(nw, nh);
    };

    const onUp = () => {
      if (!isResizing.current || !containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      const ml = parseFloat(containerRef.current.style.marginLeft || '0');
      const mt = parseFloat(containerRef.current.style.marginTop || '0');
      onCommit(w, h, ml, mt);
      onResizing?.(0, 0); // hide tooltip
      isResizing.current = false;
      activeDir.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onShift);
      window.removeEventListener('keyup', onShift);
    };
  }, [containerRef, onCommit, onResizing]);

  return { onHandleDown };
}
