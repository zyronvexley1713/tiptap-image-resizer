'use client';

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
  Droplets,
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

const dispatch = (type: string, extra?: Record<string, unknown>) =>
  window.dispatchEvent(
    new CustomEvent('imageEditorAction', { detail: { type, ...extra } })
  );

const dispatchFilter = (key: string, val: number) =>
  window.dispatchEvent(
    new CustomEvent('imageFilterChange', { detail: { key, val } })
  );

type ActivePanel = 'filters' | 'border' | 'watermark' | null;

export default function WorkspaceEditor() {
  const [imageUrl, setImageUrl] = useState('');
  const [cropActive, setCropActive] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [hasImageSelected, setHasImageSelected] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [borderValues, setBorderValues] = useState<BorderState>(DEFAULT_BORDER);
  const [selectedPreset, setSelectedPreset] = useState('Normal');
  const [presetIntensity, setPresetIntensity] = useState(100);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4);
  const [watermarkSize, setWatermarkSize] = useState(24);
  const [watermarkPos, setWatermarkPos] = useState('bottom-right');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wmTextRef = React.useRef('');
  const wmOpacityRef = React.useRef(0.4);
  const wmSizeRef = React.useRef(24);
  const wmPosRef = React.useRef('bottom-right');

  useEffect(() => {
    const onCropState = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.active !== undefined) setCropActive(d.active);
      if (d?.hasSelection !== undefined) setHasImageSelected(d.hasSelection);
    };
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
    // Sync filter values from image when selected
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

  const togglePanel = (panel: ActivePanel) =>
    setActivePanel((p) => (p === panel ? null : panel));

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

  const editor = useEditor({
    extensions: [StarterKit, ResizableImage],
    editorProps: {
      attributes: {
        style:
          'outline:none;min-height:400px;padding:1.5rem;background:#ffffff;border:1px solid #D1D5DB;border-radius:0.5rem;font-family:sans-serif;',
      },
    },
  });

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

  const divider = <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0" />;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onToolbarFileChange}
      />

      {/* ── Main Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
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
        <button
          onClick={() => {
            injectImage(imageUrl);
            setImageUrl('');
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex-shrink-0"
        >
          <ImagePlus size={16} /> Insert
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors flex-shrink-0"
          title="Upload from device"
        >
          <Upload size={15} />
        </button>

        {divider}

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

        {/* Undo / Redo */}
        {toolBtn(
          'Undo (Ctrl+Z)',
          () => dispatch('undo'),
          <Undo2 size={17} />,
          '',
          false,
          !hasImageSelected
        )}
        {toolBtn(
          'Redo (Ctrl+Y)',
          () => dispatch('redo'),
          <Redo2 size={17} />,
          '',
          false,
          !hasImageSelected
        )}
        {divider}

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          {toolBtn(
            'Align Left',
            () => dispatch('align-left'),
            <AlignLeft size={17} />,
            '',
            false,
            !hasImageSelected
          )}
          {toolBtn(
            'Align Center',
            () => dispatch('align-center'),
            <AlignCenter size={17} />,
            '',
            false,
            !hasImageSelected
          )}
          {toolBtn(
            'Align Right',
            () => dispatch('align-right'),
            <AlignRight size={17} />,
            '',
            false,
            !hasImageSelected
          )}
        </div>
        {divider}

        {/* Caption align */}
        {hasImageSelected && (
          <>
            <span className="text-xs text-gray-400 flex-shrink-0">
              Caption:
            </span>
            {toolBtn(
              'Caption Left',
              () => dispatch('caption-align-left'),
              <AlignLeft size={17} />
            )}
            {toolBtn(
              'Caption Center',
              () => dispatch('caption-align-center'),
              <AlignCenter size={17} />
            )}
            {toolBtn(
              'Caption Right',
              () => dispatch('caption-align-right'),
              <AlignRight size={17} />
            )}
            {divider}
          </>
        )}

        {/* Flip / Rotate */}
        {toolBtn(
          'Flip Horizontal',
          () => dispatch('flip-h'),
          <FlipHorizontal size={17} />,
          '',
          false,
          !hasImageSelected
        )}
        {toolBtn(
          'Flip Vertical',
          () => dispatch('flip-v'),
          <FlipVertical size={17} />,
          '',
          false,
          !hasImageSelected
        )}
        {toolBtn(
          'Rotate 90° CW',
          () => dispatch('rotate-cw'),
          <RotateCw size={17} />,
          '',
          false,
          !hasImageSelected
        )}

        {toolBtn(
          'Rotate 90° CCW',
          () => dispatch('rotate-ccw'),
          <RotateCcw size={17} />,
          '',
          false,
          !hasImageSelected
        )}

        {divider}

        {/* Replace */}
        {toolBtn(
          'Replace Image',
          () => dispatch('image-replace'),
          <RefreshCw size={17} />,
          '',
          false,
          !hasImageSelected
        )}

        {/* Crop */}
        {toolBtn(
          'Crop Image',
          () => {
            if (!cropActive) dispatch('crop');
          },
          <Crop size={17} />,
          '',
          cropActive,
          !hasImageSelected
        )}

        {/* Filters */}
        {toolBtn(
          'Filters',
          () => togglePanel('filters'),
          <SlidersHorizontal size={17} />,
          'text-purple-600 hover:bg-purple-50',
          activePanel === 'filters',
          !hasImageSelected
        )}

        {/* Border */}
        {toolBtn(
          'Border & Shadow',
          () => togglePanel('border'),
          <Square size={17} />,
          'text-orange-600 hover:bg-orange-50',
          activePanel === 'border',
          !hasImageSelected
        )}

        {/* Watermark */}
        {toolBtn(
          'Watermark',
          () => togglePanel('watermark'),
          <Type size={17} />,
          'text-green-600 hover:bg-green-50',
          activePanel === 'watermark',
          !hasImageSelected
        )}

        {divider}

        <button
          onClick={() => editor?.chain().focus().clearContent().run()}
          className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Clear All"
        >
          <Trash2 size={17} />
        </button>

        {/* Crop actions */}
        {cropActive && (
          <>
            {divider}
            <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md border border-green-200 flex-shrink-0">
              <span className="text-xs text-green-700 font-semibold mr-1">
                Crop:
              </span>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  dispatch('crop-apply');
                }}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
              >
                <Check size={14} /> Apply
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  dispatch('crop-reset');
                }}
                className="flex items-center gap-1 px-2 py-1 bg-slate-500 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  dispatch('crop-cancel');
                }}
                className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Filter Panel ── */}
      {activePanel === 'filters' && hasImageSelected && (
        <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
          {/* Presets */}
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
                    dispatch('filter-preset', {
                      preset: p.name,
                      intensity: presetIntensity,
                    });
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

          {/* Intensity */}
          {selectedPreset !== 'Normal' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-20 flex-shrink-0">
                Intensity
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={presetIntensity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setPresetIntensity(val);
                  const preset = FILTER_PRESETS.find(
                    (p) => p.name === selectedPreset
                  )!;
                  const newFilters = applyPreset(preset, val);
                  setFilterValues(newFilters);
                  dispatch('filter-preset', {
                    preset: selectedPreset,
                    intensity: val,
                  });
                }}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <span className="text-slate-300 text-xs w-10 text-right">
                {presetIntensity}%
              </span>
            </div>
          )}

          {/* Sliders */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {FILTER_SLIDERS.map(({ key, label, min, max, unit }) => (
              <div key={key} className="flex items-center gap-2 min-w-[200px]">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">
                  {label}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={filterValues[key]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFilterValues((f) => ({ ...f, [key]: val }));
                    dispatchFilter(key, val);
                    setSelectedPreset('Custom');
                  }}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-300 text-xs w-10 text-right">
                  {filterValues[key]}
                  {unit}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
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

      {/* ── Border Panel ── */}
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

      {/* ── Watermark Panel ── */}
      {activePanel === 'watermark' && hasImageSelected && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-slate-400 text-xs w-20 flex-shrink-0">
              Text
            </span>
            <input
              type="text"
              placeholder="Watermark text..."
              value={watermarkText}
              onChange={(e) => {
                setWatermarkText(e.target.value);
                wmTextRef.current = e.target.value;
              }}
              className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[180px]">
            <span className="text-slate-400 text-xs w-20 flex-shrink-0">
              Opacity
            </span>
            <input
              type="range"
              min={10}
              max={100}
              value={watermarkOpacity * 100}
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
          <div className="flex items-center gap-2 min-w-[180px]">
            <span className="text-slate-400 text-xs w-20 flex-shrink-0">
              Size
            </span>
            <input
              type="range"
              min={10}
              max={72}
              value={watermarkSize}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setWatermarkSize(v);
                wmSizeRef.current = v;
              }}
              className="flex-1 accent-blue-500 cursor-pointer"
            />
            <span className="text-slate-300 text-xs w-10 text-right">
              {watermarkSize}px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs w-20 flex-shrink-0">
              Position
            </span>
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
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const text = watermarkText.trim() || wmTextRef.current.trim();
              if (!text) return;
              dispatch('watermark-apply', {
                text,
                opacity: wmOpacityRef.current || watermarkOpacity,
                size: wmSizeRef.current || watermarkSize,
                position: wmPosRef.current || watermarkPos,
              });
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Check size={13} /> Apply Watermark
          </button>
        </div>
      )}

      {/* ── Editor ── */}
      <div className="w-full text-black">
        <EditorContent editor={editor} />
      </div>

      {/* ── Hint bar ── */}
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
