"use client";

import React, { useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export const AnimatedGrid = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 700 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    mouseX.set(clientX);
    mouseY.set(clientY);
  };

  const background = useTransform(
    [smoothX, smoothY],
    ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(120, 119, 198, 0.1), transparent 80%)`
  );

  return (
    <div 
      className="fixed inset-0 -z-10 bg-background overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Base Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Interactive Glow */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{ background }}
      />

      {/* Animated Lines/Sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: "-100%", y: Math.random() * 100 + "%" }}
            animate={{ 
              x: "200%",
              transition: { 
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10
              }
            }}
            className="absolute h-px w-[40%] bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-sm"
          />
        ))}
      </div>
    </div>
  );
};
