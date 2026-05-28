'use client';
import React from 'react';
import { CropState, CropHandle } from '../hooks/useImageCrop';

interface CropPanelProps {
  crop: CropState;
  setCrop: (c: CropState) => void;
  cropDrag: React.MutableRefObject<{
    handle: CropHandle;
    startX: number;
    startY: number;
    start: CropState;
  }>;
  onApply: () => void;
  onReset: () => void;
  onCancel: () => void;
}

export function CropPanel({ crop, cropDrag }: CropPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        borderRadius: '2px',
        overflow: 'hidden',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Dim outside crop area */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }}
      />

      {/* Crop box */}
      <div
        style={{
          position: 'absolute',
          left: `${crop.l * 100}%`,
          top: `${crop.t * 100}%`,
          right: `${crop.r * 100}%`,
          bottom: `${crop.b * 100}%`,
          border: '2px solid #fff',
          boxSizing: 'border-box',
          cursor: 'move',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cropDrag.current = {
            handle: 'move',
            startX: e.clientX,
            startY: e.clientY,
            start: { ...crop },
          };
        }}
      >
        {/* Rule-of-thirds grid */}
        {[1 / 3, 2 / 3].map((p, i) => (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${p * 100}%`,
                height: 1,
                background: 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${p * 100}%`,
                width: 1,
                background: 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
              }}
            />
          </React.Fragment>
        ))}

        {/* Corner handles */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <div
            key={corner}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              background: '#fff',
              borderRadius: 2,
              cursor:
                corner === 'tl' || corner === 'br'
                  ? 'nwse-resize'
                  : 'nesw-resize',
              ...(corner.includes('t') ? { top: -5 } : { bottom: -5 }),
              ...(corner.includes('l') ? { left: -5 } : { right: -5 }),
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cropDrag.current = {
                handle: corner,
                startX: e.clientX,
                startY: e.clientY,
                start: { ...crop },
              };
            }}
          />
        ))}
      </div>

      {/* Hint text at top */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Drag corners or box • Use toolbar to Apply / Reset / Cancel
      </div>
    </div>
  );
}
