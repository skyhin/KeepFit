'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface AnalysisNotificationProps {
  isVisible: boolean;
  status: 'analyzing' | 'success' | 'error';
  message?: string;
  onClose: () => void;
  onHeightChange?: (height: number) => void;
}

export function AnalysisNotification({
  isVisible,
  status,
  message,
  onClose,
  onHeightChange,
}: AnalysisNotificationProps) {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !notificationRef.current || !onHeightChange) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onHeightChange(height);
      }
    });

    resizeObserver.observe(notificationRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isVisible, onHeightChange]);

  useEffect(() => {
    if (!isVisible && onHeightChange) {
      onHeightChange(0);
    }
  }, [isVisible, onHeightChange]);

  const getStatusConfig = () => {
    switch (status) {
      case 'analyzing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-success" />,
          bgColor: 'bg-card border border-success/30',
          text: message || 'AI 正在分析食物，完成后会自动更新...',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-success" />,
          bgColor: 'bg-card border border-success/50',
          text: message || '分析完成！已更新热量记录',
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-warning" />,
          bgColor: 'bg-card border border-warning/50',
          text: message || '分析失败，请重试',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={notificationRef}
          className="fixed top-28 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`${config.bgColor} rounded-xl p-4 shadow-lg flex items-center gap-3`}>
            {config.icon}
            <p className="flex-1 text-sm">{config.text}</p>
            {status !== 'analyzing' && (
              <motion.button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-background/50 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4 text-gray-400" />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

