'use client';

import { createContext, useContext, useState, useRef, ReactNode } from 'react';

type AnalysisStatus = 'analyzing' | 'success' | 'error' | null;

interface AnalysisContextType {
  analysisStatus: AnalysisStatus;
  analysisMessage: string;
  setAnalysisStatus: (status: AnalysisStatus) => void;
  setAnalysisMessage: (message: string) => void;
  isAnalyzing: boolean;
  cancelAnalysis: () => void;
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  notificationHeight: number;
  setNotificationHeight: (height: number) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [notificationHeight, setNotificationHeight] = useState<number>(0);

  const isAnalyzing = analysisStatus === 'analyzing';

  const cancelAnalysis = () => {
    // 取消正在进行的请求
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setAnalysisStatus(null);
    setAnalysisMessage('');
  };

  return (
    <AnalysisContext.Provider
      value={{
        analysisStatus,
        analysisMessage,
        setAnalysisStatus,
        setAnalysisMessage,
        isAnalyzing,
        cancelAnalysis,
        abortController,
        setAbortController,
        notificationHeight,
        setNotificationHeight,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return context;
}

