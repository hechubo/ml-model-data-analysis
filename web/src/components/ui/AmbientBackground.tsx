import React from 'react';

/** Quiet editorial backdrop — presentation-friendly, no busy aurora. */
export const AmbientBackground: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#05080F]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 15% 0%, rgba(56,189,248,0.08), transparent 55%), radial-gradient(ellipse 55% 45% at 90% 10%, rgba(16,185,129,0.06), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(99,102,241,0.05), transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148,163,184,0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.045) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%)',
        }}
      />
    </div>
  );
};
