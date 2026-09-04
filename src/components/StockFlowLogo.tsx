import React from 'react';

// Brand mark — 3 offset parallelograms, identical to web app sidebar
export const StockFlowLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* bottom-left bar */}
    <rect
      x="1" y="11" width="14" height="14" rx="2"
      fill="#B8703D"
      transform="rotate(-30 1 11) skewY(-30)"
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    />
    {/* top-right bar */}
    <rect
      x="12" y="1" width="14" height="14" rx="2"
      fill="#E4BC8C"
      transform="rotate(-30 12 1) skewY(-30)"
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    />
    {/* overlap bar */}
    <rect
      x="12" y="14" width="14" height="14" rx="2"
      fill="rgba(184,112,61,0.55)"
      transform="rotate(-30 12 14) skewY(-30)"
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    />
  </svg>
);

// Simpler, more faithful version matching web CSS exactly:
export const BrandMark: React.FC<{ size?: number }> = ({ size = 33 }) => {
  const s = size;
  const unit = s * 0.58; // 19/33
  const gap  = s * 0.39; // 13/33
  const top  = s * 0.21; // 7/33

  return (
    <div style={{ width: s, height: s, position: 'relative', flexShrink: 0 }}>
      {/* Span 1 — copper */}
      <span style={{
        position: 'absolute', width: unit, height: unit,
        background: '#B8703D', borderRadius: 2,
        left: 0, top: top,
        transform: 'rotate(30deg) skewY(-30deg) scaleY(0.86)',
      }} />
      {/* Span 2 — light copper */}
      <span style={{
        position: 'absolute', width: unit, height: unit,
        background: '#E4BC8C', borderRadius: 2,
        left: gap, top: 0,
        transform: 'rotate(30deg) skewY(-30deg) scaleY(0.86)',
      }} />
      {/* Span 3 — faded copper */}
      <span style={{
        position: 'absolute', width: unit, height: unit,
        background: 'rgba(184,112,61,0.6)', borderRadius: 2,
        left: gap, top: gap,
        transform: 'rotate(30deg) skewY(-30deg) scaleY(0.86)',
      }} />
    </div>
  );
};
