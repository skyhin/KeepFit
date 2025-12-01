'use client';

import { motion } from 'framer-motion';
import { CountUp } from './CountUp';

interface StatCardProps {
  label: string;
  value: number;
  unit?: string;
  color?: 'success' | 'warning' | 'default';
  className?: string;
}

export function StatCard({ label, value, unit = '', color = 'default', className }: StatCardProps) {
  const colorClass = {
    success: 'text-success',
    warning: 'text-warning',
    default: 'text-white',
  }[color];

  return (
    <motion.div
      className={`card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>
        <CountUp value={value} decimals={0} />
        {unit && <span className="text-lg ml-1">{unit}</span>}
      </div>
    </motion.div>
  );
}

