/**
 * useImageKeyboard — इमेज कीबोर्ड शॉर्टकट हुक
 * Custom hook for keyboard shortcuts when an image is selected.
 *
 * Supported shortcuts / समर्थित शॉर्टकट:
 * - Arrow keys:       इमेज को 1px nudge करें / Nudge image 1px
 * - Shift + Arrow:    इमेज को 10px nudge करें / Nudge image 10px
 * - Alt + Arrow:      इमेज को resize करें / Resize image
 * - Delete/Backspace: इमेज delete करें / Delete image
 * - Escape:           deselect करें / Deselect or cancel crop
 *
 * Important: useCapture:true से Tiptap के पहले event capture होता है
 * Uses capture phase to intercept events before Tiptap handles them.
 */

import React, { useEffect } from 'react';

interface UseImageKeyboardOptions {
  /** इमेज सेलेक्ट है या नहीं / Whether image is selected */
  selected: boolean;
  /** क्रॉप मोड एक्टिव है या नहीं / Whether crop mode is active */
  showCrop: boolean;
  /** वर्तमान drag X offset / Current drag X offset */
  dragX: number;
  /** वर्तमान drag Y offset / Current drag Y offset */
  dragY: number;
  /** इमेज की वर्तमान चौड़ाई / Current image width */
  curW: number;
  /** इमेज की वर्तमान ऊँचाई / Current image height */
  curH: number;
  /** container का ref (boundary clamp के लिए) / Container ref for bounds checking */
  containerRef: React.RefObject<HTMLDivElement>;
  /** drag position update callback / Callback to update drag position */
  onMove: (dx: number, dy: number) => void;
  /** resize callback / Callback to resize image */
  onResize: (w: number, h: number) => void;
  /** delete callback / Callback to delete image */
  onDelete: () => void;
  /** deselect callback / Callback to deselect image */
  onDeselect: () => void;
  /** crop cancel callback / Callback to cancel crop mode */
  onCropCancel?: () => void;
}

/** सामान्य nudge step — 1px / Normal nudge step */
const NUDGE     = 1;
/** Shift के साथ nudge step — 10px / Nudge step with Shift key */
const NUDGE_BIG = 10;

/** Arrow key names / Arrow key identifiers */
const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export function useImageKeyboard({
  selected, showCrop,
  dragX, dragY, curW, curH,
  containerRef,
  onMove, onResize, onDelete, onDeselect, onCropCancel,
}: UseImageKeyboardOptions) {
  useEffect(() => {
    // इमेज सेलेक्ट नहीं है तो keyboard listen नहीं करते
    // Don't listen when image is not selected
    if (!selected) return;

    const handler = (e: KeyboardEvent) => {
      // Input/textarea में typing हो रही है तो ignore करें
      // Don't intercept while user is typing in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Shift के साथ बड़ा step, नहीं तो छोटा / Bigger step with Shift
      const step = e.shiftKey ? NUDGE_BIG : NUDGE;

      // Escape — deselect या crop cancel
      if (e.key === 'Escape') {
        if (showCrop) onCropCancel?.();
        else onDeselect();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Delete/Backspace — इमेज delete करें / Delete image
      if ((e.key === 'Delete' || e.key === 'Backspace') && !showCrop) {
        onDelete();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      if (showCrop) return;

      // Arrow keys — Tiptap को event नहीं मिलने देते
      // Capture arrow keys before Tiptap moves the cursor
      if (ARROW_KEYS.includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // Editor boundary के लिए bounds calculate करें
        // Get editor bounds for clamping
        const editorEl = containerRef.current?.closest('.ProseMirror') as HTMLElement | null;

        const getEditorBounds = () => {
          if (!editorEl || !containerRef.current) return null;
          const es = window.getComputedStyle(editorEl);
          const pl = parseFloat(es.paddingLeft)   || 0;
          const pr = parseFloat(es.paddingRight)  || 0;
          const pt = parseFloat(es.paddingTop)    || 0;
          const pb = parseFloat(es.paddingBottom) || 0;
          const er = editorEl.getBoundingClientRect();
          const cr = containerRef.current.getBoundingClientRect();

          // वर्तमान translation पढ़ें / Read current transform
          const tx = parseFloat(containerRef.current.style.transform.match(/translate\((-?[\d.]+)/)?.[1] ?? '0');
          const ty = parseFloat(containerRef.current.style.transform.match(/,\s*(-?[\d.]+)px/)?.[1] ?? '0');
          const naturalL = cr.left - tx;
          const naturalT = cr.top  - ty;

          return {
            minX: er.left   + pl - naturalL,
            maxX: er.right  - pr - naturalL - curW,
            minY: er.top    + pt - naturalT,
            maxY: er.bottom - pb - naturalT - curH,
          };
        };

        if (e.altKey) {
          // Alt + Arrow — इमेज resize करें / Resize image with Alt+Arrow
          const maxW = editorEl
            ? editorEl.clientWidth
              - (parseFloat(window.getComputedStyle(editorEl).paddingLeft)  || 0)
              - (parseFloat(window.getComputedStyle(editorEl).paddingRight) || 0)
            : 9999;

          if (e.key === 'ArrowRight') onResize(Math.min(maxW, curW + step), curH);
          if (e.key === 'ArrowLeft')  onResize(Math.max(60,   curW - step), curH);
          if (e.key === 'ArrowUp')    onResize(curW, Math.max(40, curH - step));
          if (e.key === 'ArrowDown')  onResize(curW, curH + step);
        } else {
          // Arrow — इमेज nudge करें (boundary के अंदर) / Nudge image within bounds
          const bounds = getEditorBounds();
          let ndx = e.key === 'ArrowLeft'  ? dragX - step
                  : e.key === 'ArrowRight' ? dragX + step : dragX;
          let ndy = e.key === 'ArrowUp'   ? dragY - step
                  : e.key === 'ArrowDown' ? dragY + step  : dragY;

          if (bounds) {
            ndx = Math.max(bounds.minX, Math.min(bounds.maxX, ndx));
            ndy = Math.max(bounds.minY, Math.min(bounds.maxY, ndy));
          }
          onMove(ndx, ndy);
        }
      }
    };

    // useCapture: true — Tiptap से पहले event capture करें
    // Capture phase ensures we get the event before Tiptap
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [selected, showCrop, dragX, dragY, curW, curH, containerRef, onMove, onResize, onDelete, onDeselect, onCropCancel]);
}
