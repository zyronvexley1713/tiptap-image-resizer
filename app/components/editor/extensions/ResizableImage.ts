/**
 * ResizableImage — Tiptap custom node extension
 * A fully-featured resizable image node for Tiptap editors.
 *
 * Features / सुविधाएं:
 * - Resize (8 handles, aspect ratio lock, rotate-aware) / आकार बदलना
 * - Drag (editor boundary clamped) / खींचना
 * - Crop (non-destructive preview, destructive apply) / काटना
 * - Filters (CSS + Photon WASM bake) / फ़िल्टर
 * - Flip / Rotate (native CSS transform) / पलटना / घुमाना
 * - Watermark (canvas bake) / वॉटरमार्क
 * - Border / Shadow / Caption / Alt text
 * - Undo/Redo (50 step history) / पूर्ववत करें
 *
 * Usage / उपयोग:
 * extensions: [StarterKit, ResizableImage]
 *
 * Custom configure / कस्टम सेटिंग:
 * extensions: [StarterKit, ResizableImage.configure({
 *   defaultWidth: 400,
 *   defaultAlign: 'left',
 *   maxWidth: 800,
 *   allowWatermark: false,
 * })]
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImageComponent from '../components/ResizableImageComponent';

/**
 * ResizableImageOptions — configurable options
 * npm package users इन्हें configure() से override कर सकते हैं।
 * These can be overridden using ResizableImage.configure({...}).
 */
export interface ResizableImageOptions {
  /** default insert width / इन्सर्ट होने पर default चौड़ाई */
  defaultWidth:    number;
  /** default insert height / इन्सर्ट होने पर default ऊँचाई */
  defaultHeight:   number;
  /** default alignment: 'left' | 'center' | 'right' */
  defaultAlign:    string;
  /** minimum resize width / minimum चौड़ाई */
  minWidth:        number;
  /** minimum resize height / minimum ऊँचाई */
  minHeight:       number;
  /** maximum resize width (null = no limit) / maximum चौड़ाई */
  maxWidth:        number | null;
  /** aspect ratio lock by default / default aspect ratio lock */
  lockAspectRatio: boolean;
  /** drag enable/disable / drag on/off */
  allowDrag:       boolean;
  /** crop enable/disable / crop on/off */
  allowCrop:       boolean;
  /** filters enable/disable / filters on/off */
  allowFilters:    boolean;
  /** rotate/flip enable/disable / rotate/flip on/off */
  allowRotate:     boolean;
  /** watermark enable/disable / watermark on/off */
  allowWatermark:  boolean;
  /** caption enable/disable / caption on/off */
  allowCaption:    boolean;
  /** extra HTML attributes on wrapper div / wrapper div पर extra attributes */
  HTMLAttributes:  Record<string, unknown>;


}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name:       'resizableImage',
  group:      'block',
  selectable: true,
  draggable:  true,
  atom:       true,



  /**
   * Default options — configure() से override किए जा सकते हैं
   * Default option values — can be overridden with ResizableImage.configure().
   */
  addOptions() {
    return {
      defaultWidth:    320,
      defaultHeight:   220,
      defaultAlign:    'center',
      minWidth:        60,
      minHeight:       40,
      maxWidth:        null,
      lockAspectRatio: false,
      allowDrag:       true,
      allowCrop:       true,
      allowFilters:    true,
      allowRotate:     true,
      allowWatermark:  true,
      allowCaption:    true,
      HTMLAttributes:  {},
    };
  },

  /**
   * Node attributes — इमेज की सभी properties Tiptap document में store होती हैं
   * All image properties stored in the Tiptap document as node attributes.
   */
  addAttributes() {
    return {
      // ── Basic ─────────────────────────────────────────────────────────────
      src:    { default: null },
      alt:    { default: '' },
      width:  { default: this.options.defaultWidth },
      height: { default: this.options.defaultHeight },
      align:  { default: this.options.defaultAlign },

      // ── Layout offset (alignment और manual position के लिए) ───────────────
      marginLeft: { default: 0 },
      marginTop:  { default: 0 },

      // ── Drag offset — माउस drag की position / Drag position offset ─────────
      dragX: { default: 0 },
      dragY: { default: 0 },

      // ── Crop fractions (0-1) — बाएं/दाएं/ऊपर/नीचे से crop ─────────────────
      cropL: { default: 0 },
      cropR: { default: 0 },
      cropT: { default: 0 },
      cropB: { default: 0 },

      // ── CSS Filters — CSS filter values (CSS transform में apply होते हैं) ──
      filterBrightness: { default: 100 }, // 0-200%
      filterContrast:   { default: 100 }, // 0-200%
      filterSaturate:   { default: 100 }, // 0-200%
      filterBlur:       { default: 0   }, // 0-20px
      filterGrayscale:  { default: 0   }, // 0-100%
      filterSepia:      { default: 0   }, // 0-100%
      filterHueRotate:  { default: 0   }, // 0-360deg
      filterInvert:     { default: 0   }, // 0-100%

      // ── Filter preset name — सिर्फ label, actual values sliders में हैं ─────
      filterPreset:     { default: 'Normal' },
      filterPresetName: { default: 'Normal' },

      // ── Caption ──────────────────────────────────────────────────────────
      caption:      { default: '' },
      captionAlign: { default: 'center' },

      // ── Border / Shadow ──────────────────────────────────────────────────
      borderRadius: { default: 0 },
      borderWidth:  { default: 0 },
      borderColor:  { default: '#000000' },
      borderStyle:  { default: 'solid' },
      boxShadow:    { default: '' },

      // ── Flip / Rotate — CSS transform से native / Native CSS transform ────
      flipH:   { default: false }, // horizontal flip
      flipV:   { default: false }, // vertical flip
      rotate:  { default: 0     }, // 0 / 90 / 180 / 270 degrees

      // ── Watermark (canvas में bake होता है) ────────────────────────────────
      watermarkText:    { default: '' },
      watermarkOpacity: { default: 0.4 },
      watermarkSize:    { default: 24 },
      watermarkPos:     { default: 'bottom-right' },

      originalSrc: { default: null }, // pehli baar insert hone ki src
    };
  },

  /**
   * HTML से parse करने का rule
   * Rule for parsing image from HTML (used when loading saved content).
   */
  parseHTML() {
    return [{ tag: 'div[data-resizable-image]' }];
  },

  /**
   * HTML में render करने का तरीका
   * How the node renders to HTML (for export/SSR).
   * React NodeView के बिना यह fallback है।
   */
  renderHTML({ HTMLAttributes }) {
    const { src, alt, width, height, align } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-resizable-image': '',
        'data-align': align,
        style: `display:flex;justify-content:${
          align === 'left'  ? 'flex-start' :
          align === 'right' ? 'flex-end'   : 'center'
        };margin:12px 0;`,
      }),
      [
        'img',
        {
          src,
          alt:          alt || '',
          style:        `width:${width}px;height:${height}px;object-fit:cover;display:block;pointer-events:none;`,
          'data-width':  String(width),
          'data-height': String(height),
        },
      ],
    ];
  },

  /**
   * React NodeView renderer — ResizableImageComponent को render करता है
   * Uses React to render the full interactive image component.
   */
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
