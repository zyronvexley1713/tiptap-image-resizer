# tiptap-image-resizer

A fully-featured resizable image extension for [Tiptap](https://tiptap.dev/) editors, built with React and Next.js.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Tiptap](https://img.shields.io/badge/Tiptap-2.x-purple)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔲 **Resize** | 8-handle resize with live W×H tooltip, Shift = aspect ratio lock |
| 🔄 **Rotate** | 90° CW / CCW rotation with rotate-aware resize handles (Phases 1–4) |
| ↔ **Flip** | Horizontal and vertical flip via native CSS transform |
| ✋ **Drag** | Drag image anywhere within editor boundaries |
| ✂ **Crop** | Non-destructive overlay preview → destructive canvas apply |
| 🎨 **Filters** | 11 presets (Vivid, B&W, Vintage, etc.) + 8 individual sliders + Photon WASM bake |
| 💧 **Watermark** | Text watermark with opacity, size, and position controls |
| 🖼 **Border** | Radius, width, color, style (solid/dashed/dotted/double) |
| 🌑 **Shadow** | 6 box-shadow presets |
| 💬 **Caption** | Editable caption with alignment, synced with drag |
| ↩ **Undo/Redo** | 50-step image-specific history |
| 🔁 **Master Reset** | One-click reset — restores original image (pre-Photon), clears all filters, transforms, border, caption |
| ⌨ **Keyboard** | Arrow nudge, Shift+Arrow 10px, Alt+Arrow resize, Del delete |
| 🖱 **Context Menu** | Right-click menu with all actions |
| 🔤 **Alt Text** | Inline alt text editing |
| ⚙ **Configurable** | `ResizableImage.configure({...})` for custom defaults |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
git clone https://github.com/zyronvexley1713/tiptap-image-resizer.git
cd tiptap-image-resizer
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

---

## 📦 Usage

### Basic

```tsx
import { ResizableImage } from './components/editor/extensions/ResizableImage';

const editor = useEditor({
  extensions: [StarterKit, ResizableImage],
});
```

### With Custom Options

```tsx
const editor = useEditor({
  extensions: [
    StarterKit,
    ResizableImage.configure({
      defaultWidth:    400,      // Default insert width
      defaultHeight:   300,      // Default insert height
      defaultAlign:    'center', // 'left' | 'center' | 'right'
      minWidth:        60,       // Minimum resize width
      minHeight:       40,       // Minimum resize height
      maxWidth:        800,      // null = no limit
      lockAspectRatio: false,    // Lock ratio without Shift
      allowDrag:       true,     // Enable/disable drag
      allowCrop:       true,     // Enable/disable crop
      allowFilters:    true,     // Enable/disable filters
      allowRotate:     true,     // Enable/disable rotate/flip
      allowWatermark:  true,     // Enable/disable watermark
      allowCaption:    true,     // Enable/disable caption
      HTMLAttributes:  { class: 'my-image-wrapper' },
    }),
  ],
});
```

---

## 🔁 Master Reset

The **Reset Image** button in the toolbar resets everything back to the original state:

- ✅ Restores original image source (before any Photon filter bake or watermark)
- ✅ Resets all filters (brightness, contrast, saturation, blur, etc.)
- ✅ Clears flip and rotation
- ✅ Removes border and shadow
- ✅ Clears caption and alt text
- ✅ Resets position, alignment, and dimensions to defaults
- ✅ Clears crop

The original image URL is saved automatically on first insert via `originalSrc` attribute, so even after multiple Photon bakes or watermarks, reset always goes back to the very first image.

---

## ⌨ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow keys` | Nudge image 1px |
| `Shift + Arrow` | Nudge image 10px |
| `Alt + Arrow` | Resize image |
| `Shift + drag handle` | Lock aspect ratio |
| `Delete` / `Backspace` | Delete image |
| `Escape` | Deselect / cancel crop |

---

## 🗂 Project Structure

```
app/
  components/
    editor/
      extensions/
        ResizableImage.ts           # Tiptap node extension + configurable options
      components/
        ResizableImageComponent.tsx  # Main node view component
        ImageCaption.tsx             # Caption component
      hooks/
        useResize.ts                # Resize logic (rotate-aware, phases 1–4)
        useDrag.ts                  # Drag with boundary clamp
        useImageCrop.ts             # Crop overlay + apply
        useImageKeyboard.ts         # Keyboard shortcuts
        useImageHistory.ts          # Undo/redo (50 steps)
      panels/
        FilterPanel.tsx             # Filters, presets, Photon WASM, watermark
        BorderPanel.tsx             # Border & shadow UI
        CropPanel.tsx               # Crop overlay UI
      WorkspaceEditor.tsx           # Demo toolbar + editor UI
```

---

## 🛠 Tech Stack

- [Next.js 14](https://nextjs.org/)
- [Tiptap 2.x](https://tiptap.dev/)
- [Photon WASM](https://silvia-odwyer.github.io/photon/) — image filter baking
- [Lucide React](https://lucide.dev/) — icons
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📄 License

MIT © [zyronvexley1713](https://github.com/zyronvexley1713)