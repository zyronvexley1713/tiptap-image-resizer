/**
 * CropPanel — इमेज क्रॉप ओवरले पैनल
 * Visual crop overlay rendered on top of the image during crop mode.
 *
 * यह panel केवल visual overlay है — actual crop logic useImageCrop.ts में है।
 * This is only the visual overlay. Crop logic lives in useImageCrop.ts.
 *
 * Features / सुविधाएं:
 * - बाहर का area dim होता है / Outside area is dimmed
 * - Crop box drag करके move होता है / Crop box can be moved by dragging
 * - 4 corner handles से resize होता है / 4 corner handles for resizing
 * - Rule-of-thirds grid lines / तिहाई नियम की grid lines
 * - Hint text at top / ऊपर hint text
 *
 * Actions (toolbar से होते हैं, यहाँ नहीं) / Actions via toolbar buttons:
 * - Apply: applyCrop() → canvas crop → new src
 * - Reset: resetCrop() → fractions 0
 * - Cancel: closeCrop() → overlay बंद
 */

'use client';
import React from 'react';
import { CropState, CropHandle } from '../hooks/useImageCrop';

interface CropPanelProps {
    /** वर्तमान crop fractions (0-1) / Current crop state */
    crop: CropState;
    /** crop state setter / State setter for crop */
    setCrop: (c: CropState) => void;
    /** drag state ref (useImageCrop से) / Drag ref from useImageCrop */
    cropDrag: React.MutableRefObject<{
        handle: CropHandle;
        startX: number;
        startY: number;
        start: CropState;
    }>;
    /** Apply callback / Crop bake करने का callback */
    onApply:  () => void;
    /** Reset callback / Crop reset करने का callback */
    onReset:  () => void;
    /** Cancel callback / Crop mode बंद करने का callback */
    onCancel: () => void;
}

export function CropPanel({ crop, cropDrag }: CropPanelProps) {
    return (
        <div
            style={{
                position: 'absolute', inset: 0,
                zIndex: 200, borderRadius: '2px', overflow: 'hidden',
            }}
            // Container drag को block करें / Prevent container drag during crop
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* बाहर का dim overlay / Dark overlay outside crop area */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
            }} />

            {/* Crop box — drag करके move होता है / Draggable crop selection box */}
            <div
                style={{
                    position: 'absolute',
                    // Fraction से position calculate करें / Position from fractions
                    left:   `${crop.l * 100}%`,
                    top:    `${crop.t * 100}%`,
                    right:  `${crop.r * 100}%`,
                    bottom: `${crop.b * 100}%`,
                    border: '2px solid #fff',
                    boxSizing: 'border-box',
                    cursor: 'move',
                }}
                // Crop box drag शुरू करें / Start moving crop box
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
                {/* Rule-of-thirds grid lines — तिहाई नियम की lines */}
                {[1/3, 2/3].map((p, i) => (
                    <React.Fragment key={i}>
                        {/* Horizontal line / क्षैतिज रेखा */}
                        <div style={{
                            position: 'absolute', left: 0, right: 0,
                            top: `${p * 100}%`, height: 1,
                            background: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                        }} />
                        {/* Vertical line / ऊर्ध्वाधर रेखा */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: `${p * 100}%`, width: 1,
                            background: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                        }} />
                    </React.Fragment>
                ))}

                {/* Corner resize handles — 4 कोनों के resize handles */}
                {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                    <div
                        key={corner}
                        style={{
                            position: 'absolute',
                            width: 10, height: 10,
                            background: '#fff', borderRadius: 2,
                            // Diagonal resize cursor / तिरछा resize cursor
                            cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
                            // Position at corners / कोनों पर position
                            ...(corner.includes('t') ? { top: -5    } : { bottom: -5 }),
                            ...(corner.includes('l') ? { left: -5   } : { right:  -5 }),
                        }}
                        // Corner drag शुरू करें / Start corner resize
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

            {/* Hint text — toolbar instructions / Toolbar से actions करें */}
            <div style={{
                position: 'absolute', top: 6, left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.7)', fontSize: 11,
                pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
                Drag corners or box • Use toolbar to Apply / Reset / Cancel
            </div>
        </div>
    );
}
