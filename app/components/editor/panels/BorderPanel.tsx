/**
 * BorderPanel — बॉर्डर और शैडो पैनल
 * Panel component for controlling image border and box shadow styles.
 *
 * Controls / नियंत्रण:
 * - Border radius / गोल कोने (0-50px)
 * - Border width / बॉर्डर मोटाई (0-12px)
 * - Border color / बॉर्डर रंग (color picker)
 * - Border style / बॉर्डर प्रकार (solid/dashed/dotted/double)
 * - Box shadow / छाया (6 presets)
 */

'use client';
import React from 'react';

/**
 * BorderState — बॉर्डर की सभी properties
 * All border-related properties stored in node attrs.
 */
export interface BorderState {
  /** गोल कोने का radius (px) / Border radius in pixels */
  borderRadius: number;
  /** बॉर्डर की मोटाई (px) / Border width in pixels */
  borderWidth:  number;
  /** बॉर्डर का रंग / Border color (hex) */
  borderColor:  string;
  /** बॉर्डर का प्रकार / Border style */
  borderStyle:  string;
  /** box shadow CSS value / Box shadow CSS string */
  boxShadow:    string;
}

/** Default border state — सब 0/empty / All zero/empty defaults */
export const DEFAULT_BORDER: BorderState = {
  borderRadius: 0,
  borderWidth:  0,
  borderColor:  '#000000',
  borderStyle:  'solid',
  boxShadow:    '',
};

/**
 * Shadow presets — ready-made shadow options
 * Pre-defined shadow styles for quick selection.
 */
const SHADOW_PRESETS = [
  { label: 'None',   value: '' },
  { label: 'Soft',   value: '0 4px 16px rgba(0,0,0,0.15)' },
  { label: 'Medium', value: '0 8px 24px rgba(0,0,0,0.25)' },
  { label: 'Hard',   value: '4px 4px 0px rgba(0,0,0,0.8)' },
  { label: 'Glow',   value: '0 0 20px rgba(59,130,246,0.6)' },
  { label: 'Inner',  value: 'inset 0 2px 8px rgba(0,0,0,0.2)' },
];

interface BorderPanelProps {
  /** वर्तमान border state / Current border values */
  state:    BorderState;
  /** कोई भी value बदलने पर callback / Callback when any border value changes */
  onChange: (key: keyof BorderState, val: string | number) => void;
  /** सब reset करने का callback / Callback to reset all border values */
  onReset:  () => void;
}

export function BorderPanel({ state, onChange, onReset }: BorderPanelProps) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '12px 20px',
      padding: '10px 14px', background: '#1e293b',
      borderRadius: 8, color: '#e2e8f0', fontSize: 12,
    }}>

      {/* Border Radius — गोल कोने / Rounded corners */}
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:200 }}>
        <span style={{ color:'#94a3b8', width:90, flexShrink:0 }}>Radius</span>
        <input type="range" min={0} max={50} value={state.borderRadius}
          onChange={(e) => onChange('borderRadius', parseInt(e.target.value))}
          style={{ flex:1, accentColor:'#3b82f6', cursor:'pointer' }} />
        <span style={{ width:36, textAlign:'right' }}>{state.borderRadius}px</span>
      </div>

      {/* Border Width — बॉर्डर मोटाई / Border thickness */}
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:200 }}>
        <span style={{ color:'#94a3b8', width:90, flexShrink:0 }}>Border</span>
        <input type="range" min={0} max={12} value={state.borderWidth}
          onChange={(e) => onChange('borderWidth', parseInt(e.target.value))}
          style={{ flex:1, accentColor:'#3b82f6', cursor:'pointer' }} />
        <span style={{ width:36, textAlign:'right' }}>{state.borderWidth}px</span>
      </div>

      {/* Border Color — केवल border > 0 होने पर दिखता है / Shown only when border width > 0 */}
      {state.borderWidth > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:'#94a3b8', width:90, flexShrink:0 }}>Color</span>
          <input type="color" value={state.borderColor}
            onChange={(e) => onChange('borderColor', e.target.value)}
            style={{ width:36, height:28, border:'none', borderRadius:4, cursor:'pointer', background:'none' }} />
          <span style={{ color:'#64748b' }}>{state.borderColor}</span>
        </div>
      )}

      {/* Border Style — solid/dashed/dotted/double / केवल border > 0 होने पर */}
      {state.borderWidth > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:'#94a3b8', width:90, flexShrink:0 }}>Style</span>
          {(['solid','dashed','dotted','double'] as const).map((s) => (
            <button key={s}
              onMouseDown={(e) => { e.preventDefault(); onChange('borderStyle', s); }}
              style={{
                padding:'2px 8px', borderRadius:4, fontSize:11, cursor:'pointer',
                background: state.borderStyle === s ? '#3b82f6' : '#334155',
                color:'#fff', border:'none',
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Box Shadow — preset shadows / छाया के presets */}
      <div style={{ display:'flex', alignItems:'center', gap:8, width:'100%' }}>
        <span style={{ color:'#94a3b8', width:90, flexShrink:0 }}>Shadow</span>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {SHADOW_PRESETS.map((p) => (
            <button key={p.label}
              onMouseDown={(e) => { e.preventDefault(); onChange('boxShadow', p.value); }}
              style={{
                padding:'3px 10px', borderRadius:4, fontSize:11, cursor:'pointer',
                background: state.boxShadow === p.value ? '#3b82f6' : '#334155',
                color:'#fff', border:'none',
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset — सब default पर वापस / Reset all to defaults */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onReset(); }}
        style={{ padding:'4px 12px', background:'#334155', border:'none', borderRadius:4, color:'#cbd5e1', cursor:'pointer', fontSize:11 }}>
        Reset Border
      </button>
    </div>
  );
}
