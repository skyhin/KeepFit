'use client';

import { useAnalysis } from '@/contexts/AnalysisContext';
import { AnalysisNotification } from './AnalysisNotification';
import { useEffect, useState } from 'react';

export function GlobalAnalysisNotification() {
  const { analysisStatus, analysisMessage, setAnalysisStatus, setNotificationHeight } = useAnalysis();
  const [hasNotification, setHasNotification] = useState(false);

  useEffect(() => {
    setHasNotification(analysisStatus !== null);
  }, [analysisStatus]);

  return (
    <AnalysisNotification
      isVisible={hasNotification}
      status={analysisStatus || 'analyzing'}
      message={analysisMessage}
      onClose={() => setAnalysisStatus(null)}
      onHeightChange={setNotificationHeight}
    />
  );
}
