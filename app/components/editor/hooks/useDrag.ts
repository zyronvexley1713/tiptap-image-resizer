/**
 * useDrag — इमेज ड्रैग हुक
 * Custom hook for dragging the image within the editor boundaries.
 *
 * यह हुक निम्नलिखित कार्य करता है:
 * - माउस से इमेज को drag करने की सुविधा देता है
 * - ProseMirror editor की boundary के अंदर clamp करता है
 * - caption को image के साथ sync करता है
 * - resize handle और toolbar पर drag को ignore करता है
 */

import { useRef, useCallback, useEffect } from 'react';

interface UseDragOptions {
  /** इमेज container का ref / Ref to the image container div */
  containerRef: React.RefObject<HTMLDivElement>;
  /** कैप्शन element का ref (drag sync के लिए) / Ref to caption element for sync */
  captionRef?: React.RefObject<HTMLElement>;
  /** इमेज सेलेक्ट है या नहीं / Whether the image is currently selected */
  selected: boolean;
  /** क्रॉप मोड एक्टिव है या नहीं / Whether crop mode is active */
  showCrop: boolean;
  /** वर्तमान X offset / Current X drag offset from node attrs */
  dragX: number;
  /** वर्तमान Y offset / Current Y drag offset from node attrs */
  dragY: number;
  /** drag complete होने पर नई position save करें / Callback to save final drag position */
  onCommit: (dx: number, dy: number) => void;
}

export function useDrag({
  containerRef, captionRef, selected, showCrop, dragX, dragY, onCommit,
}: UseDragOptions) {
  /** drag चल रही है या नहीं / Whether dragging is in progress */
  const isDragging = useRef(false);

  /**
   * drag शुरू होने की position snapshot
   * Snapshot of position at drag start.
   * naturalL/T: बिना translation के container की actual screen position
   */
  const dragStart = useRef({ x: 0, y: 0, dx: 0, dy: 0, naturalL: 0, naturalT: 0 });

  /**
   * माउस down होने पर drag शुरू करता है
   * Initiates drag on mousedown. Ignores resize handles and toolbar clicks.
   */
  const onContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!selected) return;
      // resize handle पर click है तो drag नहीं / Skip resize handles
      if ((e.target as HTMLElement).dataset.resizeHandle) return;
      // toolbar पर click है तो drag नहीं / Skip toolbar
      if ((e.target as HTMLElement).closest('[data-toolbar]')) return;
      // crop mode में drag नहीं / Skip during crop
      if (showCrop) return;

      e.preventDefault();
      e.stopPropagation();

      const el = containerRef.current;
      if (!el) return;

      // वर्तमान transform से live offset पढ़ें / Read current transform
      const m = el.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
      const currentDx = m ? parseFloat(m[1]) : dragX;
      const currentDy = m ? parseFloat(m[2]) : dragY;

      // Translation हटाने के बाद container की वास्तविक position
      // Natural position = screen position minus current translation
      const cr = el.getBoundingClientRect();
      const naturalL = cr.left - currentDx;
      const naturalT = cr.top  - currentDy;

      isDragging.current = true;
      dragStart.current  = { x: e.clientX, y: e.clientY, dx: currentDx, dy: currentDy, naturalL, naturalT };
    },
    [selected, showCrop, dragX, dragY, containerRef]
  );

  useEffect(() => {
    /**
     * माउस move होने पर position update करता है
     * Updates image position during drag, clamped inside editor bounds.
     */
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      let ndx = dragStart.current.dx + (e.clientX - dragStart.current.x);
      let ndy = dragStart.current.dy + (e.clientY - dragStart.current.y);

      // ProseMirror editor की boundary के अंदर clamp करें
      // Clamp position inside ProseMirror editor boundaries
      const editor = containerRef.current.closest('.ProseMirror') as HTMLElement | null;
      if (editor) {
        const er = editor.getBoundingClientRect();
        const iw = containerRef.current.offsetWidth;
        const ih = containerRef.current.offsetHeight;
        const { naturalL, naturalT } = dragStart.current;

        // Editor का padding निकालें / Get editor computed padding
        const es = window.getComputedStyle(editor);
        const pl = parseFloat(es.paddingLeft)   || 0;
        const pr = parseFloat(es.paddingRight)  || 0;
        const pt = parseFloat(es.paddingTop)    || 0;
        const pb = parseFloat(es.paddingBottom) || 0;

        // Boundary के बाहर नहीं जाने देते / Clamp to editor bounds
        ndx = Math.max(er.left  + pl - naturalL, Math.min(er.right  - pr - naturalL - iw, ndx));
        ndy = Math.max(er.top   + pt - naturalT, Math.min(er.bottom - pb - naturalT - ih, ndy));
      }

      // Container और caption दोनों को move करें / Move both container and caption
      containerRef.current.style.transform = `translate(${ndx}px, ${ndy}px)`;
      if (captionRef?.current) {
        captionRef.current.style.transform = `translate(${ndx}px, ${ndy}px)`;
      }
    };

    /**
     * माउस release होने पर final position save करता है
     * Commits final drag position to Tiptap node attrs on mouse up.
     */
    const onUp = () => {
      if (!isDragging.current || !containerRef.current) return;
      const m = containerRef.current.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
      if (m) onCommit(parseFloat(m[1]), parseFloat(m[2]));
      isDragging.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [containerRef, captionRef, onCommit]);

  return { onContainerMouseDown };
}
