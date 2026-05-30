/**
 * ImageCaption — इमेज कैप्शन कॉम्पोनेंट
 * Caption component displayed below the resizable image.
 *
 * दो modes में काम करता है / Works in two modes:
 * - Selected mode: editable input field दिखता है (placeholder के साथ)
 * - Display mode: italic figcaption दिखता है (केवल caption हो तो)
 *
 * Drag sync: useDrag से captionRef मिलता है जिससे
 * caption image के साथ move होता है।
 * The caption moves in sync with the image during drag via captionRef.
 */

'use client';
import React from 'react';

interface ImageCaptionProps {
    /** कैप्शन टेक्स्ट / Caption text content */
    caption: string;
    /** इमेज सेलेक्ट है या नहीं / Whether the image is selected */
    selected: boolean;
    /** इमेज की चौड़ाई (caption को match करने के लिए) / Image width to match caption width */
    curW: number;
    /** कैप्शन का alignment: 'left' | 'center' | 'right' */
    captionAlign: string;
    /** image का computed marginLeft (alignment के लिए) / Computed margin for alignment */
    marginLeft: number;
    /** drag X offset (image के साथ sync) / Drag X offset synced with image */
    dragX: number;
    /** drag Y offset (image के साथ sync) / Drag Y offset synced with image */
    dragY: number;
    /** caption बदलने पर callback / Callback when caption text changes */
    onChange: (val: string) => void;
}

export const ImageCaption = React.forwardRef<HTMLElement, ImageCaptionProps>(
    ({ caption, selected, curW, captionAlign, marginLeft, dragX, dragY, onChange }, ref) => {

        /** Text alignment CSS value / टेक्स्ट अलाइनमेंट */
        const textAlign =
            captionAlign === 'right'  ? 'right'  :
                captionAlign === 'center' ? 'center' : 'left';

        /**
         * Common styles — image के साथ position और size match करता है
         * Shared styles ensuring caption aligns and moves with the image.
         */
        const commonStyle: React.CSSProperties = {
            display:    'block',
            marginTop:  '10px',
            marginLeft: `${marginLeft}px`,
            fontSize:   '13px',
            textAlign,
            width:      `${curW}px`,
            boxSizing:  'border-box',
            // Image के साथ drag sync / Moves with image during drag
            transform:  `translate(${dragX}px, ${dragY}px)`,
        };

        // ── Selected mode — editable input ──────────────────────────────────────
        if (selected) {
            return (
                <input
                    ref={ref as React.RefObject<HTMLInputElement>}
                    type="text"
                    placeholder="Add image caption..."
                    value={caption}
                    onChange={(e) => onChange(e.target.value)}
                    // Image drag को trigger नहीं करने देते / Prevent drag on caption click
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        ...commonStyle,
                        padding:    '4px 8px',
                        border:     '1px dashed #9ca3af',
                        borderRadius: '4px',
                        background: 'transparent',
                        color:      '#4b5563',
                        outline:    'none',
                    }}
                />
            );
        }

        // ── Display mode — caption नहीं है तो कुछ नहीं दिखाते ──────────────────
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
