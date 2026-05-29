'use client';
import React from 'react';

interface ImageToolbarProps {
  align: string;
  showCrop: boolean;
  showFilters: boolean;
  onAlign: (a: 'left' | 'center' | 'right') => void;
  onCropToggle: () => void;
  onFilterToggle: () => void;
}

const btn = (active = false): React.CSSProperties => ({
  width: 28,
  height: 26,
  border: 'none',
  borderRadius: 4,
  background: active ? '#3b82f6' : 'transparent',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export function ImageToolbar({
  align,
  showCrop,
  showFilters,
  onAlign,
  onCropToggle,
  onFilterToggle,
}: ImageToolbarProps) {
  return (
    <div
      data-toolbar="true"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        top: '-42px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#1e293b',
        borderRadius: 7,
        padding: '3px 6px',
        zIndex: 100,
        boxShadow: '0 3px 12px rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      {(['left', 'center', 'right'] as const).map((a) => (
        <button
          key={a}
          style={btn(align === a)}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAlign(a);
          }}
          title={`Align ${a}`}
        >
          {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
        </button>
      ))}
      <div
        style={{ width: 1, height: 18, background: '#475569', margin: '0 3px' }}
      />
      <button
        style={btn(showCrop)}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCropToggle();
        }}
        title="Crop"
      >
        ✂
      </button>
      <button
        style={btn(showFilters)}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFilterToggle();
        }}
        title="Filters"
      >
        🎛
      </button>
    </div>
  );
}
