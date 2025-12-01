'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { motion } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function CountUp({ value, duration = 1, decimals = 0, className }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const display = useTransform(spring, (latest) => {
    return latest.toFixed(decimals);
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <motion.span className={className} style={{ display: 'inline-block' }}>
      {display}
    </motion.span>
  );
}

