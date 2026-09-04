import React from 'react';

export const AmbientGlow: React.FC = () => {
  return (
    <div className="ambient-radial-glow pointer-events-none" aria-hidden="true">
      {/* Top right atmospheric amber/terracotta glow */}
      <div 
        className="absolute -top-24 -right-16 w-96 h-96 rounded-full blur-[90px] opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #7C3B24 0%, #D97736 50%, transparent 70%)',
        }}
      />

      {/* Mid left ambient burnt sienna accent */}
      <div 
        className="absolute top-1/3 -left-28 w-80 h-80 rounded-full blur-[100px] opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #7C3B24 0%, #D97736 55%, transparent 75%)',
        }}
      />
    </div>
  );
};
