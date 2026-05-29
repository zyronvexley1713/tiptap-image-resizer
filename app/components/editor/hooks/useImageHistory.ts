import { useRef, useCallback } from 'react';

type Snapshot = Record<string, unknown>;

interface UseImageHistoryOptions {
  getAttrs: () => Snapshot;
  updateAttributes: (attrs: Snapshot) => void;
  maxHistory?: number;
}

export function useImageHistory({
  getAttrs,
  updateAttributes,
  maxHistory = 50,
}: UseImageHistoryOptions) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  const snapshot = useCallback(() => {
    const current = getAttrs();
    const last = past.current[past.current.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(current)) return;
    past.current.push(current);
    if (past.current.length > maxHistory) past.current.shift();
    future.current = [];
  }, [getAttrs, maxHistory]);

  const undo = useCallback(() => {
    if (past.current.length < 2) return;
    const current = past.current.pop()!;
    future.current.push(current);
    const prev = past.current[past.current.length - 1];
    updateAttributes(prev);
  }, [updateAttributes]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    past.current.push(next);
    updateAttributes(next);
  }, [updateAttributes]);

  const canUndo = past.current.length >= 2;
  const canRedo = future.current.length > 0;

  return { snapshot, undo, redo, canUndo, canRedo };
}
