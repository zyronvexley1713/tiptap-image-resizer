'use client';

/**
 * WorkspaceEditor — मुख्य एडिटर कॉम्पोनेंट
 * Main editor component that provides the toolbar UI and Tiptap editor instance.
 *
 * यह कॉम्पोनेंट निम्नलिखित कार्य करता है:
 * - इमेज इन्सर्ट / अपलोड (URL या फ़ाइल से)
 * - इमेज एलाइनमेंट, फ्लिप, रोटेट
 * - फ़िल्टर पैनल (प्रीसेट + स्लाइडर)
 * - बॉर्डर / शैडो पैनल
 * - वॉटरमार्क पैनल
 * - क्रॉप एक्शन बटन
 * - कीबोर्ड शॉर्टकट हिंट बार
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from './extensions/ResizableImage';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImagePlus,
  Trash2,
  Crop,
  SlidersHorizontal,
  Check,
  X,
  RotateCcw,
  Upload,
  RefreshCw,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Square,
  Type,
  Undo2,
  Redo2,
} from 'lucide-react';
import {
  BorderPanel,
  DEFAULT_BORDER,
  type BorderState,
} from './panels/BorderPanel';
import {
  FILTER_PRESETS,
  FILTER_SLIDERS,
  DEFAULT_FILTERS,
  applyPreset,
  type FilterState,
} from './panels/FilterPanel';

/**
 * CustomEvent dispatch helper — इमेज एडिटर एक्शन भेजता है
 * Dispatches a custom window event to communicate with ResizableImageComponent.
 * extra: अतिरिक्त डेटा जो event के साथ भेजा जाता है
 */
const dispatch = (type: string, extra?: Record<string, unknown>) =>
    window.dispatchEvent(
        new CustomEvent('imageEditorAction', { detail: { type, ...extra } })
    );

/**
 * फ़िल्टर स्लाइडर की वैल्यू बदलने पर event भेजता है
 * Dispatches filter change event when a slider value changes.
 */
const dispatchFilter = (key: string, val: number) =>
    window.dispatchEvent(
        new CustomEvent('imageFilterChange', { detail: { key, val } })
    );

/**
 * ActivePanel — कौन सा पैनल खुला है
 * Tracks which side panel is currently open: filters, border, or watermark.
 */
type ActivePanel = 'filters' | 'border' | 'watermark' | null;

export default function WorkspaceEditor() {
  // ── State declarations ────────────────────────────────────────────────────

  /** URL इनपुट फ़ील्ड की वैल्यू / Value of image URL input field */
  const [imageUrl, setImageUrl] = useState('');

  /** क्रॉप मोड एक्टिव है या नहीं / Whether crop mode is currently active */
  const [cropActive, setCropActive] = useState(false);

  /** कौन सा पैनल खुला है / Which panel is currently open */
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  /** कोई इमेज सेलेक्ट है या नहीं / Whether any image is currently selected */
  const [hasImageSelected, setHasImageSelected] = useState(false);

  /** फ़िल्टर स्लाइडर की वर्तमान वैल्यू / Current filter slider values */
  const [filterValues, setFilterValues] = useState<FilterState>(DEFAULT_FILTERS);

  /** बॉर्डर पैनल की वर्तमान वैल्यू / Current border panel values */
  const [borderValues, setBorderValues] = useState<BorderState>(DEFAULT_BORDER);

  /** चुना गया फ़िल्टर प्रीसेट / Currently selected filter preset name */
  const [selectedPreset, setSelectedPreset] = useState('Normal');

  /** प्रीसेट इंटेंसिटी (0-100) / Preset intensity percentage */
  const [presetIntensity, setPresetIntensity] = useState(100);

  /** वॉटरमार्क टेक्स्ट / Watermark text string */
  const [watermarkText, setWatermarkText] = useState('');

  /** वॉटरमार्क ओपेसिटी (0.1 - 1.0) / Watermark opacity value */
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4);

  /** वॉटरमार्क फ़ॉन्ट साइज़ / Watermark font size in pixels */
  const [watermarkSize, setWatermarkSize] = useState(24);

  /** वॉटरमार्क पोज़िशन / Watermark position on image */
  const [watermarkPos, setWatermarkPos] = useState('bottom-right');

  /** फ़ाइल इनपुट रेफ़रेंस (hidden input) / Ref for hidden file input element */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * वॉटरमार्क के लिए refs — stale closure से बचने के लिए
   * Refs for watermark values to avoid stale closure in dispatch callbacks.
   * React state async होती है, इसलिए apply बटन पर latest value पाने के लिए refs ज़रूरी हैं।
   */
  const wmTextRef    = React.useRef('');
  const wmOpacityRef = React.useRef(0.4);
  const wmSizeRef    = React.useRef(24);
  const wmPosRef     = React.useRef('bottom-right');

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    /**
     * क्रॉप state बदलने पर toolbar को अपडेट करता है
     * Updates toolbar state when crop mode changes in the image component.
     */
    const onCropState = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.active !== undefined) setCropActive(d.active);
      if (d?.hasSelection !== undefined) setHasImageSelected(d.hasSelection);
    };

    /**
     * इमेज सेलेक्शन बदलने पर toolbar को अपडेट करता है
     * Updates toolbar when image selection changes (select/deselect).
     */
    const onSelection = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.selected !== undefined) {
        setHasImageSelected(d.selected);
        if (!d.selected) {
          setCropActive(false);
          setActivePanel(null);
        }
      }
    };

    /**
     * इमेज सेलेक्ट होने पर फ़िल्टर/बॉर्डर वैल्यू sync करता है
     * Syncs filter and border values when an image is selected,
     * so the toolbar shows the image's current settings.
     */
    const onFilterSync = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.filters) setFilterValues(d.filters);
      if (d?.border) setBorderValues(d.border);
    };

    window.addEventListener('imageCropStateChange', onCropState);
    window.addEventListener('imageSelectionChange', onSelection);
    window.addEventListener('imageStateSync', onFilterSync);

    return () => {
      window.removeEventListener('imageCropStateChange', onCropState);
      window.removeEventListener('imageSelectionChange', onSelection);
      window.removeEventListener('imageStateSync', onFilterSync);
    };
  }, []);

  /**
   * पैनल टॉगल करता है — same पैनल पर क्लिक करने से बंद हो जाता है
   * Toggles a side panel. Clicking the same panel button closes it.
   */
  const togglePanel = (panel: ActivePanel) =>
      setActivePanel((p) => (p === panel ? null : panel));

  /** सैंपल इमेज URLs — डेमो के लिए / Sample images for demo purposes */
  const sampleImages = [
    {
      label: '🏔 Landscape',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    },
    {
      label: '🌸 Portrait',
      url: 'https://images.unsplash.com/photo-1494790108755-2616b612b5fd?w=600&q=80',
    },
    {
      label: '🎨 Abstract',
      url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=700&q=80',
    },
  ];

  /**
   * Tiptap editor इंस्टेंस
   * Tiptap editor instance with StarterKit and ResizableImage extensions.
   * ResizableImage.configure() से default options override किए जा सकते हैं।
   */
  /**
   * उदाहरण: ResizableImage को configure करें / Example: configure ResizableImage
   *
   * Basic (default options):
   *   extensions: [StarterKit, ResizableImage]
   *
   * Custom configure:
   *   extensions: [
   *     StarterKit,
   *     ResizableImage.configure({
   *       defaultWidth:    400,    // default insert width
   *       defaultHeight:   300,    // default insert height
   *       defaultAlign:    'left', // 'left' | 'center' | 'right'
   *       minWidth:        100,    // minimum resize width
   *       minHeight:       80,     // minimum resize height
   *       maxWidth:        800,    // null = no limit
   *       lockAspectRatio: true,   // Shift के बिना भी ratio lock
   *       allowDrag:       true,   // drag on/off
   *       allowCrop:       true,   // crop on/off
   *       allowFilters:    true,   // filters on/off
   *       allowRotate:     true,   // rotate/flip on/off
   *       allowWatermark:  false,  // watermark disable
   *       allowCaption:    true,   // caption on/off
   *       HTMLAttributes:  { class: 'my-image-wrapper' },
   *     })
   *   ]
   */
  /**
   * उदाहरण: ResizableImage को configure करें / Example usage with configure()
   *
   * ── Basic (default options) ──────────────────────────────────────────────
   * extensions: [StarterKit, ResizableImage]
   *
   * ── Custom configure ─────────────────────────────────────────────────────
   * extensions: [
   *   StarterKit,
   *   ResizableImage.configure({
   *     defaultWidth:    400,    // default insert width / इन्सर्ट होने पर चौड़ाई
   *     defaultHeight:   300,    // default insert height / इन्सर्ट होने पर ऊँचाई
   *     defaultAlign:    'left', // 'left' | 'center' | 'right'
   *     minWidth:        100,    // minimum resize width / minimum चौड़ाई
   *     minHeight:       80,     // minimum resize height / minimum ऊँचाई
   *     maxWidth:        800,    // null = no limit / null = कोई सीमा नहीं
   *     lockAspectRatio: true,   // Shift के बिना भी aspect ratio lock
   *     allowDrag:       true,   // drag enable/disable
   *     allowCrop:       true,   // crop enable/disable
   *     allowFilters:    true,   // filters enable/disable
   *     allowRotate:     true,   // rotate/flip enable/disable
   *     allowWatermark:  false,  // watermark disable / वॉटरमार्क बंद करें
   *     allowCaption:    true,   // caption enable/disable
   *     HTMLAttributes:  { class: 'my-image-wrapper' }, // extra HTML attrs
   *   })
   * ]
   */
  const editor = useEditor({
    extensions: [StarterKit, ResizableImage],
    editorProps: {
      attributes: {
        style:
            'outline:none;min-height:400px;padding:1.5rem;background:#ffffff;border:1px solid #D1D5DB;border-radius:0.5rem;font-family:sans-serif;',
      },
    },
  });

  /**
   * एडिटर में इमेज इन्सर्ट करता है (URL से)
   * Inserts a resizable image node into the editor at current cursor position.
   */
  const injectImage = (urlPath: string) => {
    if (!urlPath || !editor) return;
    editor
        .chain()
        .focus()
        .insertContent({
          type: 'resizableImage',
          attrs: {
            src: urlPath,
            alt: 'Image',
            width: 320,
            height: 220,
            align: 'center',
          },
        })
        .run();
  };

  /**
   * डिवाइस से फ़ाइल अपलोड करने पर इमेज इन्सर्ट करता है
   * Handles file upload from device, converts to base64 and inserts into editor.
   */
  const onToolbarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) injectImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /**
   * Reusable toolbar button helper
   * टूलबार बटन बनाने का helper function।
   * active: बटन हाइलाइट है / disabled: बटन disabled है
   */
  const toolBtn = (
      title: string,
      onClick: (e: React.MouseEvent) => void,
      children: React.ReactNode,
      extra = '',
      active = false,
      disabled = false
  ) => (
      <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!disabled) onClick(e);
          }}
          disabled={disabled}
          className={`p-2 rounded transition-colors ${extra} ${
              disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : active
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={title}
      >
        {children}
      </button>
  );

  /** टूलबार डिवाइडर / Visual separator between toolbar button groups */
  const divider = <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0" />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
      <div className="flex flex-col w-full max-w-4xl mx-auto space-y-3">

        {/* Hidden file input — डिवाइस से इमेज अपलोड के लिए / For device image upload */}
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onToolbarFileChange}
        />

        {/* ── Main Toolbar — मुख्य टूलबार ── */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">

          {/* URL input — इमेज URL पेस्ट करें / Paste image URL to insert */}
          <input
              type="text"
              placeholder="Paste image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  injectImage(imageUrl);
                  setImageUrl('');
                }
              }}
              className="flex-grow min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
          />

          {/* Insert button — URL से इमेज डालें / Insert image from URL */}
          <button
              onClick={() => { injectImage(imageUrl); setImageUrl(''); }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex-shrink-0"
          >
            <ImagePlus size={16} /> Insert
          </button>

          {/* Upload button — डिवाइस से फ़ाइल अपलोड / Upload from device */}
          <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors flex-shrink-0"
              title="Upload from device"
          >
            <Upload size={15} />
          </button>

          {divider}

          {/* Sample images — डेमो इमेज बटन / Quick-insert sample images */}
          {sampleImages.map((img, i) => (
              <button
                  key={i}
                  onClick={() => injectImage(img.url)}
                  className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded border border-gray-200 transition-colors flex-shrink-0"
              >
                {img.label}
              </button>
          ))}

          <div className="flex-1" />
          {divider}

          {/* Undo / Redo — पूर्ववत करें / फिर से करें */}
          {toolBtn('Undo (Ctrl+Z)', () => dispatch('undo'), <Undo2 size={17} />, '', false, !hasImageSelected)}
          {toolBtn('Redo (Ctrl+Y)', () => dispatch('redo'), <Redo2 size={17} />, '', false, !hasImageSelected)}
          {divider}

          {/* Alignment — इमेज अलाइनमेंट (बाएं / बीच / दाएं) */}
          <div className="flex items-center gap-0.5">
            {toolBtn('Align Left',   () => dispatch('align-left'),   <AlignLeft   size={17} />, '', false, !hasImageSelected)}
            {toolBtn('Align Center', () => dispatch('align-center'), <AlignCenter size={17} />, '', false, !hasImageSelected)}
            {toolBtn('Align Right',  () => dispatch('align-right'),  <AlignRight  size={17} />, '', false, !hasImageSelected)}
          </div>
          {divider}

          {/* Caption alignment — कैप्शन अलाइनमेंट (केवल सेलेक्टेड इमेज पर) */}
          {hasImageSelected && (
              <>
                <span className="text-xs text-gray-400 flex-shrink-0">Caption:</span>
                {toolBtn('Caption Left',   () => dispatch('caption-align-left'),   <AlignLeft   size={17} />)}
                {toolBtn('Caption Center', () => dispatch('caption-align-center'), <AlignCenter size={17} />)}
                {toolBtn('Caption Right',  () => dispatch('caption-align-right'),  <AlignRight  size={17} />)}
                {divider}
              </>
          )}

          {/* Flip / Rotate — पलटें / घुमाएं */}
          {toolBtn('Flip Horizontal', () => dispatch('flip-h'),    <FlipHorizontal size={17} />, '', false, !hasImageSelected)}
          {toolBtn('Flip Vertical',   () => dispatch('flip-v'),    <FlipVertical   size={17} />, '', false, !hasImageSelected)}
          {toolBtn('Rotate 90° CW',   () => dispatch('rotate-cw'), <RotateCw       size={17} />, '', false, !hasImageSelected)}
          {toolBtn('Rotate 90° CCW',  () => dispatch('rotate-ccw'),<RotateCcw      size={17} />, '', false, !hasImageSelected)}
          {divider}

          {/* Replace — इमेज बदलें / Replace current image */}
          {toolBtn('Replace Image', () => dispatch('image-replace'), <RefreshCw size={17} />, '', false, !hasImageSelected)}

          {/* Crop — इमेज क्रॉप करें / Open crop mode */}
          {toolBtn(
              'Crop Image',
              () => { if (!cropActive) dispatch('crop'); },
              <Crop size={17} />,
              '', cropActive, !hasImageSelected
          )}

          {/* Filters — फ़िल्टर पैनल खोलें / Open filter panel */}
          {toolBtn('Filters', () => togglePanel('filters'),
              <SlidersHorizontal size={17} />,
              'text-purple-600 hover:bg-purple-50', activePanel === 'filters', !hasImageSelected
          )}

          {/* Border & Shadow — बॉर्डर/शैडो पैनल / Open border panel */}
          {toolBtn('Border & Shadow', () => togglePanel('border'),
              <Square size={17} />,
              'text-orange-600 hover:bg-orange-50', activePanel === 'border', !hasImageSelected
          )}

          {/* Watermark — वॉटरमार्क पैनल / Open watermark panel */}
          {toolBtn('Watermark', () => togglePanel('watermark'),
              <Type size={17} />,
              'text-green-600 hover:bg-green-50', activePanel === 'watermark', !hasImageSelected
          )}

          {/* Reset All — सब default पर / Reset all image attrs to default */}
          {toolBtn(
              'Reset Image',
              () => dispatch('reset-all'),
              <RotateCcw size={17} />,
              'text-red-500 hover:bg-red-50',
              false,
              !hasImageSelected
          )}

          {divider}

          {/* Clear All — सब मिटाएं / Clear all editor content */}
          <button
              onClick={() => editor?.chain().focus().clearContent().run()}
              className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Clear All"
          >
            <Trash2 size={17} />
          </button>

          {/* Crop action buttons — क्रॉप मोड में Apply/Reset/Cancel बटन */}
          {cropActive && (
              <>
                {divider}
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md border border-green-200 flex-shrink-0">
                  <span className="text-xs text-green-700 font-semibold mr-1">Crop:</span>
                  <button
                      onMouseDown={(e) => { e.preventDefault(); dispatch('crop-apply'); }}
                      className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                  >
                    <Check size={14} /> Apply
                  </button>
                  <button
                      onMouseDown={(e) => { e.preventDefault(); dispatch('crop-reset'); }}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-500 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                  <button
                      onMouseDown={(e) => { e.preventDefault(); dispatch('crop-cancel'); }}
                      className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </>
          )}
        </div>

        {/* ── Filter Panel — फ़िल्टर पैनल ── */}
        {activePanel === 'filters' && hasImageSelected && (
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-3">

              {/* Filter presets — प्रीसेट बटन (Normal, Vivid, B&W आदि) */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_PRESETS.map((p) => (
                      <button
                          key={p.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedPreset(p.name);
                            const newFilters = applyPreset(p, presetIntensity);
                            setFilterValues(newFilters);
                            dispatch('filter-preset', { preset: p.name, intensity: presetIntensity });
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              selectedPreset === p.name
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                      >
                        {p.emoji} {p.name}
                      </button>
                  ))}
                </div>
              </div>

              {/* Intensity slider — प्रीसेट की तीव्रता (0-100%) / Preset intensity */}
              {selectedPreset !== 'Normal' && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20 flex-shrink-0">Intensity</span>
                    <input
                        type="range" min={0} max={100} value={presetIntensity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setPresetIntensity(val);
                          const preset = FILTER_PRESETS.find((p) => p.name === selectedPreset)!;
                          const newFilters = applyPreset(preset, val);
                          setFilterValues(newFilters);
                          dispatch('filter-preset', { preset: selectedPreset, intensity: val });
                        }}
                        className="flex-1 accent-blue-500 cursor-pointer"
                    />
                    <span className="text-slate-300 text-xs w-10 text-right">{presetIntensity}%</span>
                  </div>
              )}

              {/* Individual filter sliders — अलग-अलग फ़िल्टर स्लाइडर */}
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {FILTER_SLIDERS.map(({ key, label, min, max, unit }) => (
                    <div key={key} className="flex items-center gap-2 min-w-[200px]">
                      <span className="text-slate-400 text-xs w-20 flex-shrink-0">{label}</span>
                      <input
                          type="range" min={min} max={max} value={filterValues[key]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFilterValues((f) => ({ ...f, [key]: val }));
                            dispatchFilter(key, val);
                            setSelectedPreset('Custom');
                          }}
                          className="flex-1 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-slate-300 text-xs w-10 text-right">
                  {filterValues[key]}{unit}
                </span>
                    </div>
                ))}
              </div>

              <div className="flex gap-2">
                {/* Reset filters — सभी फ़िल्टर रीसेट करें / Reset all filters to default */}
                <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFilterValues(DEFAULT_FILTERS);
                      setSelectedPreset('Normal');
                      setPresetIntensity(100);
                      dispatch('filter-reset');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs font-medium rounded transition-colors"
                >
                  <RotateCcw size={13} /> Reset Filters
                </button>

                {/* Apply (Photon) — Photon WASM से फ़िल्टर पिक्सल में bake करें */}
                <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      dispatch('filter-apply-photon', { filters: filterValues });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                >
                  <Check size={13} /> Apply (Photon)
                </button>
              </div>
            </div>
        )}

        {/* ── Border Panel — बॉर्डर और शैडो पैनल ── */}
        {activePanel === 'border' && hasImageSelected && (
            <BorderPanel
                state={borderValues}
                onChange={(key, val) => {
                  setBorderValues((b) => ({ ...b, [key]: val }));
                  dispatch('border-change', { key, val });
                }}
                onReset={() => {
                  setBorderValues(DEFAULT_BORDER);
                  dispatch('border-reset');
                }}
            />
        )}

        {/* ── Watermark Panel — वॉटरमार्क पैनल ── */}
        {activePanel === 'watermark' && hasImageSelected && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 bg-slate-800 rounded-lg border border-slate-700">

              {/* Watermark text input — वॉटरमार्क टेक्स्ट / Text to show as watermark */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">Text</span>
                <input
                    type="text" placeholder="Watermark text..."
                    value={watermarkText}
                    onChange={(e) => {
                      setWatermarkText(e.target.value);
                      wmTextRef.current = e.target.value;
                    }}
                    className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Opacity slider — वॉटरमार्क पारदर्शिता / Watermark transparency */}
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">Opacity</span>
                <input
                    type="range" min={10} max={100} value={watermarkOpacity * 100}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) / 100;
                      setWatermarkOpacity(v);
                      wmOpacityRef.current = v;
                    }}
                    className="flex-1 accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-300 text-xs w-10 text-right">
              {Math.round(watermarkOpacity * 100)}%
            </span>
              </div>

              {/* Size slider — वॉटरमार्क का आकार / Watermark font size */}
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">Size</span>
                <input
                    type="range" min={10} max={72} value={watermarkSize}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setWatermarkSize(v);
                      wmSizeRef.current = v;
                    }}
                    className="flex-1 accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-300 text-xs w-10 text-right">{watermarkSize}px</span>
              </div>

              {/* Position select — वॉटरमार्क की स्थिति / Where to place watermark */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">Position</span>
                <select
                    value={watermarkPos}
                    onChange={(e) => {
                      setWatermarkPos(e.target.value);
                      wmPosRef.current = e.target.value;
                    }}
                    className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs outline-none"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </div>

              {/* Apply watermark — वॉटरमार्क लगाएं (destructive) / Bake watermark into image pixels */}
              <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const text = watermarkText.trim() || wmTextRef.current.trim();
                    if (!text) return;
                    dispatch('watermark-apply', {
                      text,
                      opacity:  wmOpacityRef.current || watermarkOpacity,
                      size:     wmSizeRef.current    || watermarkSize,
                      position: wmPosRef.current     || watermarkPos,
                    });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
              >
                <Check size={13} /> Apply Watermark
              </button>
            </div>
        )}

        {/* ── Editor — Tiptap एडिटर ── */}
        <div className="w-full text-black">
          <EditorContent editor={editor} />
        </div>

        {/* ── Hint bar — कीबोर्ड शॉर्टकट (केवल सेलेक्टेड इमेज पर दिखता है) ── */}
        {hasImageSelected && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              {(
                  [
                    ['Arrow keys', 'nudge 1px'],
                    ['Shift + Arrow', 'nudge 10px'],
                    ['Alt + Arrow', 'resize'],
                    ['Shift + handle', 'lock ratio'],
                    ['Del', 'delete'],
                    ['Right-click', 'menu'],
                  ] as [string, string][]
              ).map(([key, desc]) => (
                  <span key={key} className="text-xs">
              <kbd className="px-1.5 py-0.5 bg-white border border-blue-200 rounded text-blue-700 font-mono font-semibold text-xs">
                {key}
              </kbd>
              <span className="text-blue-400 ml-1">{desc}</span>
            </span>
              ))}
            </div>
        )}
      </div>
  );
}
