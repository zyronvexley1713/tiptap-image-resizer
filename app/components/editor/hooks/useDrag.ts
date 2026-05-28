// import { useRef, useCallback, useEffect } from 'react';

// interface UseDragOptions {
//   containerRef: React.RefObject<HTMLDivElement>;
//   selected:  boolean;
//   showCrop:  boolean;
//   dragX:     number;
//   dragY:     number;
//   onCommit:  (dx: number, dy: number) => void;
// }

// export function useDrag({
//   containerRef, selected, showCrop, dragX, dragY, onCommit,
// }: UseDragOptions) {
//   const isDragging = useRef(false);
//   const dragStart  = useRef({ x: 0, y: 0, dx: 0, dy: 0 });

//   const onContainerMouseDown = useCallback(
//     (e: React.MouseEvent) => {
//       if (!selected) return;
//       if ((e.target as HTMLElement).dataset.resizeHandle) return;
//       if ((e.target as HTMLElement).closest('[data-toolbar]')) return;
//       if (showCrop) return;
//       e.preventDefault();
//       isDragging.current = true;
//       dragStart.current  = { x: e.clientX, y: e.clientY, dx: dragX, dy: dragY };
//     },
//     [selected, showCrop, dragX, dragY]
//   );

//   useEffect(() => {
//     const onMove = (e: MouseEvent) => {
//       if (!isDragging.current || !containerRef.current) return;

//       const ndx = dragStart.current.dx + (e.clientX - dragStart.current.x);
//       const ndy = dragStart.current.dy + (e.clientY - dragStart.current.y);

//       // ── Clamp inside .ProseMirror editor ─────────────────────────────────
//       const editor = containerRef.current.closest('.ProseMirror') as HTMLElement | null;
//       let cx = ndx, cy = ndy;

//       if (editor) {
//         const er  = editor.getBoundingClientRect();
//         const cr  = containerRef.current.getBoundingClientRect();
//         const iw  = containerRef.current.offsetWidth;
//         const ih  = containerRef.current.offsetHeight;
//         // Natural (un-translated) position relative to editor
//         const nl  = cr.left - er.left - ndx;
//         const nt  = cr.top  - er.top  - ndy;
//         cx = Math.max(-nl, Math.min(er.width  - nl - iw, ndx));
//         cy = Math.max(-nt, Math.min(er.height - nt - ih, ndy));
//       }

//       containerRef.current.style.transform = `translate(${cx}px, ${cy}px)`;
//     };

//     const onUp = () => {
//       if (!isDragging.current || !containerRef.current) return;
//       const m = containerRef.current.style.transform.match(
//         /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/
//       );
//       if (m) onCommit(parseFloat(m[1]), parseFloat(m[2]));
//       isDragging.current = false;
//     };

//     window.addEventListener('mousemove', onMove);
//     window.addEventListener('mouseup',   onUp);
//     return () => {
//       window.removeEventListener('mousemove', onMove);
//       window.removeEventListener('mouseup',   onUp);
//     };
//   }, [containerRef, onCommit]);

//   return { onContainerMouseDown };
// }

import { useRef, useCallback, useEffect } from 'react';

interface UseDragOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  captionRef?: React.RefObject<HTMLElement>;
  selected: boolean;
  showCrop: boolean;
  dragX: number;
  dragY: number;
  onCommit: (dx: number, dy: number) => void;
}

export function useDrag({
  containerRef,
  captionRef,
  selected,
  showCrop,
  dragX,
  dragY,
  onCommit,
}: UseDragOptions) {
  const isDragging = useRef(false);
  const dragStart = useRef({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    naturalL: 0,
    naturalT: 0, // container's untranslated position
  });

  const onContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!selected) return;
      if ((e.target as HTMLElement).dataset.resizeHandle) return;
      if ((e.target as HTMLElement).closest('[data-toolbar]')) return;
      if (showCrop) return;

      e.preventDefault();
      e.stopPropagation();

      const el = containerRef.current;
      if (!el) return;

      // Read live transform
      const m = el.style.transform.match(
        /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/
      );
      const currentDx = m ? parseFloat(m[1]) : dragX;
      const currentDy = m ? parseFloat(m[2]) : dragY;

      // Natural position = bounding rect minus current translation
      const cr = el.getBoundingClientRect();
      const naturalL = cr.left - currentDx;
      const naturalT = cr.top - currentDy;

      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        dx: currentDx,
        dy: currentDy,
        naturalL,
        naturalT,
      };
    },
    [selected, showCrop, dragX, dragY, containerRef]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      let ndx = dragStart.current.dx + (e.clientX - dragStart.current.x);
      let ndy = dragStart.current.dy + (e.clientY - dragStart.current.y);

      // Clamp inside ProseMirror editor
      const editor = containerRef.current.closest(
        '.ProseMirror'
      ) as HTMLElement | null;
      if (editor) {
        const er = editor.getBoundingClientRect();
        const iw = containerRef.current.offsetWidth;
        const ih = containerRef.current.offsetHeight;
        const { naturalL, naturalT } = dragStart.current;

        // Editor ka computed padding lo
        const editorStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(editorStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(editorStyle.paddingRight) || 0;
        const paddingTop = parseFloat(editorStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(editorStyle.paddingBottom) || 0;

        const minX = er.left + paddingLeft - naturalL;
        const maxX = er.right - paddingRight - naturalL - iw;
        const minY = er.top + paddingTop - naturalT;
        const maxY = er.bottom - paddingBottom - naturalT - ih;

        ndx = Math.max(minX, Math.min(maxX, ndx));
        ndy = Math.max(minY, Math.min(maxY, ndy));
      }

      containerRef.current.style.transform = `translate(${ndx}px, ${ndy}px)`;
      if (captionRef?.current) {
        captionRef.current.style.transform = `translate(${ndx}px, ${ndy}px)`;
      }
    };

    const onUp = () => {
      if (!isDragging.current || !containerRef.current) return;
      const m = containerRef.current.style.transform.match(
        /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/
      );
      if (m) onCommit(parseFloat(m[1]), parseFloat(m[2]));
      isDragging.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [containerRef, captionRef, onCommit]);

  return { onContainerMouseDown };
}
