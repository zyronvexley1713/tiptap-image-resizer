import React from 'react';
import { useEffect } from 'react';

interface UseImageKeyboardOptions {
  selected: boolean;
  showCrop: boolean;
  dragX: number;
  dragY: number;
  curW: number;
  curH: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onMove: (dx: number, dy: number) => void;
  onResize: (w: number, h: number) => void;
  onDelete: () => void;
  onDeselect: () => void;
  onCropCancel?: () => void;
}

const NUDGE = 1;
const NUDGE_BIG = 10;

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export function useImageKeyboard({
  selected,
  showCrop,
  dragX,
  dragY,
  curW,
  curH,
  containerRef,
  onMove,
  onResize,
  onDelete,
  onDeselect,
  onCropCancel,
}: UseImageKeyboardOptions) {
  useEffect(() => {
    if (!selected) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const step = e.shiftKey ? NUDGE_BIG : NUDGE;

      // Escape
      if (e.key === 'Escape') {
        if (showCrop) onCropCancel?.();
        else onDeselect();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !showCrop) {
        onDelete();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      if (showCrop) return;

      // Arrow keys — stopImmediatePropagation so Tiptap doesn't move cursor
      if (ARROW_KEYS.includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // Get editor bounds for clamping
        const editorEl = containerRef.current?.closest(
          '.ProseMirror'
        ) as HTMLElement | null;
        const getEditorBounds = () => {
          if (!editorEl || !containerRef.current) return null;
          const es = window.getComputedStyle(editorEl);
          const pl = parseFloat(es.paddingLeft) || 0;
          const pr = parseFloat(es.paddingRight) || 0;
          const pt = parseFloat(es.paddingTop) || 0;
          const pb = parseFloat(es.paddingBottom) || 0;
          const er = editorEl.getBoundingClientRect();
          const cr = containerRef.current.getBoundingClientRect();
          const tx = parseFloat(
            containerRef.current.style.transform.match(
              /translate\((-?[\d.]+)/
            )?.[1] ?? '0'
          );
          const ty = parseFloat(
            containerRef.current.style.transform.match(
              /,\s*(-?[\d.]+)px/
            )?.[1] ?? '0'
          );
          const naturalL = cr.left - tx;
          const naturalT = cr.top - ty;
          return {
            minX: er.left + pl - naturalL,
            maxX: er.right - pr - naturalL - curW,
            minY: er.top + pt - naturalT,
            maxY: er.bottom - pb - naturalT - curH,
          };
        };

        if (e.altKey) {
          // Alt + Arrow = resize (clamped to editor width)
          const maxW = editorEl
            ? editorEl.clientWidth -
              (parseFloat(window.getComputedStyle(editorEl).paddingLeft) || 0) -
              (parseFloat(window.getComputedStyle(editorEl).paddingRight) || 0)
            : 9999;
          if (e.key === 'ArrowRight')
            onResize(Math.min(maxW, curW + step), curH);
          if (e.key === 'ArrowLeft') onResize(Math.max(60, curW - step), curH);
          if (e.key === 'ArrowUp') onResize(curW, Math.max(40, curH - step));
          if (e.key === 'ArrowDown') onResize(curW, curH + step);
        } else {
          // Arrow = nudge drag (clamped to editor bounds)
          const bounds = getEditorBounds();
          let ndx =
            e.key === 'ArrowLeft'
              ? dragX - step
              : e.key === 'ArrowRight'
              ? dragX + step
              : dragX;
          let ndy =
            e.key === 'ArrowUp'
              ? dragY - step
              : e.key === 'ArrowDown'
              ? dragY + step
              : dragY;
          if (bounds) {
            ndx = Math.max(bounds.minX, Math.min(bounds.maxX, ndx));
            ndy = Math.max(bounds.minY, Math.min(bounds.maxY, ndy));
          }
          onMove(ndx, ndy);
        }
      }
    };

    // useCapture: true — pehle yeh handler fire hoga, Tiptap se pehle
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [
    selected,
    showCrop,
    dragX,
    dragY,
    curW,
    curH,
    containerRef,
    onMove,
    onResize,
    onDelete,
    onDeselect,
    onCropCancel,
  ]);
}
