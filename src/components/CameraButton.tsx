 'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, X } from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';

interface CameraButtonProps {
  onCapture: (image: string) => Promise<void>;
}

export function CameraButton({ onCapture }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isAnalyzing, cancelAnalysis } = useAnalysis();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // 读取图片并转换为 Base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        // 压缩图片（最大 1MB，1024px）
        const compressed = await compressImage(base64, 1024, 0.8);
        await onCapture(compressed);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('图片处理失败:', error);
    } finally {
      setIsProcessing(false);
      // 重置 input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (isAnalyzing) {
      // 如果正在分析，询问是否打断
      if (confirm('上一张图片正在分析中，是否取消当前分析并上传新图片？')) {
        cancelAnalysis();
        // 等待一下再允许上传
        setTimeout(() => {
          inputRef.current?.click();
        }, 100);
      }
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isProcessing || isAnalyzing}
      />
      <div className="w-full">
        {isAnalyzing ? (
          <motion.button
            className="btn-primary flex items-center justify-center gap-2 w-full opacity-60"
            disabled
            whileTap={{ scale: 0.95 }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>分析中，请稍候...</span>
          </motion.button>
        ) : (
          <motion.button
            className="btn-primary flex items-center justify-center gap-2 w-full"
            onClick={handleClick}
            disabled={isProcessing}
            whileTap={{ scale: 0.95 }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>处理中...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>拍摄食物</span>
              </>
            )}
          </motion.button>
        )}
        {isAnalyzing && (
          <motion.button
            className="mt-2 w-full py-2 rounded-lg bg-card text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
            onClick={() => {
              if (confirm('确定要取消当前分析吗？')) {
                cancelAnalysis();
              }
            }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" />
            <span>取消分析</span>
          </motion.button>
        )}
      </div>
    </>
  );
}

// 压缩图片工具函数
function compressImage(
  base64: string,
  maxWidth: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      
      // 检查大小（目标 < 1MB）
      if (compressed.length > 1024 * 1024) {
        // 如果还是太大，降低质量重试
        resolve(compressImage(base64, maxWidth, quality * 0.7));
      } else {
        resolve(compressed);
      }
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = base64;
  });
}

