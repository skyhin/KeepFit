'use client';

import { motion } from 'framer-motion';

interface CircularProgressProps {
  value: number; // 当前值
  max: number; // 目标值
  size?: number; // 圆环大小（直径）
  strokeWidth?: number; // 圆环宽度
  className?: string;
}

export function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // 计算进度百分比（0-1）
  const progress = Math.max(value / max, 0);
  
  // 计算完整圈数和最后一圈的进度
  const fullCircles = Math.floor(progress);
  const lastCircleProgress = progress - fullCircles;
  
  // 根据是否达成目标选择颜色
  const isComplete = value >= max;
  const strokeColor = isComplete ? '#10b981' : '#f59e0b';
  
  // 计算显示的百分比
  const displayPercent = Math.round(progress * 100);
  
  // 起点位置（顶部，12点钟方向）
  const startX = centerX;
  const startY = centerY - radius;
  
  // 终点位置（根据最后一圈的进度计算）
  const endAngle = lastCircleProgress * 360;
  const endX = centerX + radius * Math.sin((endAngle * Math.PI) / 180);
  const endY = centerY - radius * Math.cos((endAngle * Math.PI) / 180);
  
  // 箭头大小
  const arrowSize = strokeWidth * 0.6;
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* 定义阴影滤镜（Apple Watch 风格） */}
        <defs>
          <filter id="ringShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* 渐变定义（让圆环有立体感） */}
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="1" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        
        {/* 背景圆环（灰色，带阴影） */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
          opacity={0.3}
        />
        
        {/* 完整圈数：每圈都是完整的绿色圆环 */}
        {Array.from({ length: Math.min(fullCircles, 10) }).map((_, index) => (
          <circle
            key={`full-${index}`}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            transform={`rotate(-90 ${centerX} ${centerY})`}
            filter="url(#ringShadow)"
            opacity={0.95}
          />
        ))}
        
        {/* 最后一圈的进度圆环（从顶部开始，顺时针填充） */}
        {lastCircleProgress > 0 && (
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            transform={`rotate(-90 ${centerX} ${centerY})`}
            filter="url(#ringShadow)"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - lastCircleProgress * circumference }}
            transition={{ duration: 1, ease: 'easeOut' }}
            opacity={1}
          />
        )}
        
        {/* 起点箭头标记（顶部，12点钟方向，指向顺时针） */}
        <g transform={`translate(${startX}, ${startY}) rotate(90)`}>
          <path
            d={`M 0,${-arrowSize * 0.3} L ${-arrowSize * 0.6},${-arrowSize * 1.2} L ${arrowSize * 0.6},${-arrowSize * 1.2} Z`}
            fill={strokeColor}
            filter="url(#ringShadow)"
            opacity={0.9}
          />
        </g>
        
        {/* 终点圆点标记（根据最后一圈的进度位置） */}
        {progress > 0 && lastCircleProgress > 0 && (
          <circle
            cx={endX}
            cy={endY}
            r={strokeWidth / 4}
            fill={strokeColor}
            filter="url(#ringShadow)"
            opacity={0.9}
          />
        )}
      </svg>
      
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className={`text-lg font-bold ${isComplete ? 'text-success' : 'text-warning'}`}>
          {displayPercent}%
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {isComplete ? '达成' : '进行中'}
        </div>
      </div>
    </div>
  );
}
