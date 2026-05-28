'use client';
import React from 'react';

interface ImageCaptionProps {
  caption: string;
  selected: boolean;
  curW: number;
  captionAlign: string;
  marginLeft: number;
  dragX: number;
  dragY: number;
  onChange: (val: string) => void;
}

export const ImageCaption = React.forwardRef<HTMLElement, ImageCaptionProps>(
  (
    {
      caption,
      selected,
      curW,
      captionAlign,
      marginLeft,
      dragX,
      dragY,
      onChange,
    },
    ref
  ) => {
    const textAlign =
      captionAlign === 'right'
        ? 'right'
        : captionAlign === 'center'
        ? 'center'
        : 'left';

    const commonStyle: React.CSSProperties = {
      display: 'block',
      marginTop: '10px',
      marginLeft: `${marginLeft}px`,
      fontSize: '13px',
      textAlign,
      width: `${curW}px`,
      boxSizing: 'border-box',
      transform: `translate(${dragX}px, ${dragY}px)`,
    };

    if (selected) {
      return (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="Add image caption..."
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...commonStyle,
            padding: '4px 8px',
            border: '1px dashed #9ca3af',
            borderRadius: '4px',
            background: 'transparent',
            color: '#4b5563',
            outline: 'none',
          }}
        />
      );
    }

    if (!caption) return null;

    return (
      <figcaption
        ref={ref as React.RefObject<HTMLElement>}
        style={{ ...commonStyle, color: '#6b7280', fontStyle: 'italic' }}
      >
        {caption}
      </figcaption>
    );
  }
);

ImageCaption.displayName = 'ImageCaption';
