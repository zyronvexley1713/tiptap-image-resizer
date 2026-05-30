/**
 * useImageHistory — इमेज एडिट हिस्ट्री हुक
 * Custom hook for undo/redo functionality for image edits.
 *
 * यह हुक Tiptap के built-in undo से अलग है — यह सिर्फ
 * इमेज node के attrs की history track करता है।
 * This is separate from Tiptap's undo — it tracks only image node attribute history.
 *
 * काम करने का तरीका / How it works:
 * - हर action से पहले snapshot() call होता है
 * - undo: पिछली state restore होती है
 * - redo: आगे की state restore होती है
 * - Maximum 50 history steps store होते हैं
 */

import { useRef, useCallback } from 'react';

/** Snapshot type — एक समय पर इमेज के सभी attrs / All image attrs at a point in time */
type Snapshot = Record<string, unknown>;

interface UseImageHistoryOptions {
  /** वर्तमान attrs पढ़ने का function / Function to read current node attrs */
  getAttrs: () => Snapshot;
  /** attrs update करने का function / Function to update node attrs */
  updateAttributes: (attrs: Snapshot) => void;
  /** maximum history steps (default: 50) / Max undo steps to keep */
  maxHistory?: number;
}

export function useImageHistory({
  getAttrs,
  updateAttributes,
  maxHistory = 50,
}: UseImageHistoryOptions) {
  /** पिछले states का stack / Stack of past states for undo */
  const past   = useRef<Snapshot[]>([]);
  /** आगे के states का stack / Stack of future states for redo */
  const future = useRef<Snapshot[]>([]);

  /**
   * वर्तमान state का snapshot लेता है
   * Takes a snapshot of current attrs before an edit.
   * Duplicate snapshots को ignore करता है / Ignores duplicate snapshots.
   * नया action आने पर redo stack clear होता है / Clears redo stack on new action.
   */
  const snapshot = useCallback(() => {
    const current = getAttrs();
    const last    = past.current[past.current.length - 1];

    // Same state का duplicate snapshot मत लो / Skip duplicate snapshots
    if (last && JSON.stringify(last) === JSON.stringify(current)) return;

    past.current.push(current);

    // History limit exceed होने पर सबसे पुरानी entry हटाएं / Trim if over limit
    if (past.current.length > maxHistory) past.current.shift();

    // नया action आने पर redo stack clear / Clear redo on new action
    future.current = [];
  }, [getAttrs, maxHistory]);

  /**
   * एक step पीछे जाता है / Undo one step — restores previous state
   * कम से कम 2 entries होनी चाहिए (current + previous)
   */
  const undo = useCallback(() => {
    if (past.current.length < 2) return;

    // Current state को future में push करो / Move current to future
    const current = past.current.pop()!;
    future.current.push(current);

    // पिछली state restore करो / Restore previous state
    const prev = past.current[past.current.length - 1];
    updateAttributes(prev);
  }, [updateAttributes]);

  /**
   * एक step आगे जाता है / Redo one step — restores next state
   */
  const redo = useCallback(() => {
    if (future.current.length === 0) return;

    // अगली state को past में push करो / Move next state to past
    const next = future.current.pop()!;
    past.current.push(next);
    updateAttributes(next);
  }, [updateAttributes]);

  const canUndo = past.current.length >= 2;
  const canRedo = future.current.length > 0;

  return { snapshot, undo, redo, canUndo, canRedo };
}
