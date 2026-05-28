// import { Node, mergeAttributes } from '@tiptap/core';
// import { ReactNodeViewRenderer } from '@tiptap/react';
// import ResizableImageComponent from '../components/ResizableImageComponent';

// export const ResizableImage = Node.create({
//   name: 'resizableImage',
//   group: 'block',
//   selectable: true,
//   draggable: true,
//   atom: true,

//   addAttributes() {
//     return {
//       src: { default: null },
//       alt: { default: '' },
//       width: { default: 320 },
//       height: { default: 220 },
//       align: { default: 'center' },
//       marginLeft: { default: 0 },
//       marginTop: { default: 0 },
//       // drag offset
//       dragX: { default: 0 },
//       dragY: { default: 0 },
//       // crop fractions (0-1)
//       cropL: { default: 0 },
//       cropR: { default: 0 },
//       cropT: { default: 0 },
//       cropB: { default: 0 },
//       // individual filter sliders
//       filterBrightness: { default: 100 },
//       filterContrast: { default: 100 },
//       filterSaturate: { default: 100 },
//       filterBlur: { default: 0 },
//       filterGrayscale: { default: 0 },
//       filterSepia: { default: 0 },
//       filterHueRotate: { default: 0 },
//       filterInvert: { default: 0 },
//       // preset name (just a label, sliders carry the actual values)
//       filterPreset: { default: 'Normal' },
//       //Caption attributes
//       caption: { default: '' },
//       captionAlign: { default: 'center' },
//     };
//   },

//   parseHTML() {
//     return [{ tag: 'div[data-resizable-image]' }];
//   },

//   renderHTML({ HTMLAttributes }) {
//     const { src, alt, width, height, align } = HTMLAttributes;
//     return [
//       'div',
//       mergeAttributes({
//         'data-resizable-image': '',
//         'data-align': align,
//         style: `display:flex;justify-content:${
//           align === 'left'
//             ? 'flex-start'
//             : align === 'right'
//             ? 'flex-end'
//             : 'center'
//         };margin:12px 0;`,
//       }),
//       [
//         'img',
//         {
//           src,
//           alt: alt || '',
//           style: `width:${width}px;height:${height}px;object-fit:cover;display:block;pointer-events:none;`,
//           'data-width': String(width),
//           'data-height': String(height),
//         },
//       ],
//     ];
//   },

//   addNodeView() {
//     return ReactNodeViewRenderer(ResizableImageComponent);
//   },
// });

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImageComponent from '../components/ResizableImageComponent';

export const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      width: { default: 320 },
      height: { default: 220 },
      align: { default: 'center' },
      marginLeft: { default: 0 },
      marginTop: { default: 0 },
      // drag offset
      dragX: { default: 0 },
      dragY: { default: 0 },
      // crop fractions (0-1)
      cropL: { default: 0 },
      cropR: { default: 0 },
      cropT: { default: 0 },
      cropB: { default: 0 },
      // individual filter sliders
      filterBrightness: { default: 100 },
      filterContrast: { default: 100 },
      filterSaturate: { default: 100 },
      filterBlur: { default: 0 },
      filterGrayscale: { default: 0 },
      filterSepia: { default: 0 },
      filterHueRotate: { default: 0 },
      filterInvert: { default: 0 },
      // preset name (just a label, sliders carry the actual values)
      filterPreset: { default: 'Normal' },
      // Caption
      caption: { default: '' },
      captionAlign: { default: 'center' },
      // Border / Shadow
      borderRadius: { default: 0 },
      borderWidth: { default: 0 },
      borderColor: { default: '#000000' },
      borderStyle: { default: 'solid' },
      boxShadow: { default: '' },
      // Flip / Rotate
      flipH: { default: false },
      flipV: { default: false },
      rotate: { default: 0 },
      // Watermark
      watermarkText: { default: '' },
      watermarkOpacity: { default: 0.4 },
      watermarkSize: { default: 24 },
      watermarkPos: { default: 'bottom-right' },
      // Filter preset
      filterPresetName: { default: 'Normal' },
      // Undo history stored externally — no attr needed
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-resizable-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, width, height, align } = HTMLAttributes;
    return [
      'div',
      mergeAttributes({
        'data-resizable-image': '',
        'data-align': align,
        style: `display:flex;justify-content:${
          align === 'left'
            ? 'flex-start'
            : align === 'right'
            ? 'flex-end'
            : 'center'
        };margin:12px 0;`,
      }),
      [
        'img',
        {
          src,
          alt: alt || '',
          style: `width:${width}px;height:${height}px;object-fit:cover;display:block;pointer-events:none;`,
          'data-width': String(width),
          'data-height': String(height),
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
