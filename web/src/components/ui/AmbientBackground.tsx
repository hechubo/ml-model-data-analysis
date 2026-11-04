import React from 'react';
import { motion } from 'framer-motion';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04070F]">
      {/* Animated glowing aurora orbs */}
      <motion.div
        animate={{
          x: [0, 45, -25, 0],
          y: [0, -35, 25, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-[540px] h-[540px] rounded-full bg-cyan-500/12 blur-[130px]"
      />
      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.94, 1.1, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 -right-32 w-[520px] h-[520px] rounded-full bg-violet-500/12 blur-[140px]"
      />
      <motion.div
        animate={{
          x: [0, 30, -40, 0],
          y: [0, -25, 35, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-40 left-1/3 w-[580px] h-[460px] rounded-full bg-emerald-500/8 blur-[140px]"
      />

      {/* Precision coordinate grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 85% 80% at 50% 45%, #000 50%, transparent 100%)',
        }}
      />
    </div>
  );
};
