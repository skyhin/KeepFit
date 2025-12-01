'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraButton } from '@/components/CameraButton';
import { StatCard } from '@/components/StatCard';
import { CountUp } from '@/components/CountUp';
import { CircularProgress } from '@/components/CircularProgress';
import { getDashboardData, updateActiveEnergy, updateBMR } from '@/services/daily';
import { addFoodRecord, getFoodDetails } from '@/services/food';
import { getSettings } from '@/services/settings';
import { getDateString } from '@/services/db';
import type { DailySummary, AIAnalysisResult } from '@/types';
import { Settings, Calendar, List, Cookie, Egg, Droplet } from 'lucide-react';
import Link from 'next/link';
import { useAnalysis } from '@/contexts/AnalysisContext';

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCaloriesInput, setActiveCaloriesInput] = useState('');
  const [isEditingActive, setIsEditingActive] = useState(false);
  const [bmrInput, setBmrInput] = useState('');
  const [isEditingBMR, setIsEditingBMR] = useState(false);
  const [useManualBMR, setUseManualBMR] = useState(false);
  const [dailyMacros, setDailyMacros] = useState({ carbs: 0, protein: 0, fat: 0 });
  const { setAnalysisStatus, setAnalysisMessage, setAbortController, isAnalyzing, analysisStatus, notificationHeight } = useAnalysis();

  // 当useManualBMR变为false时，自动退出编辑状态
  useEffect(() => {
    if (!useManualBMR && isEditingBMR) {
      setIsEditingBMR(false);
      setBmrInput('');
    }
  }, [useManualBMR, isEditingBMR]);

  // 初始化加载数据，并检测日期变化
  useEffect(() => {
    loadDashboard();
    
    // 设置一个检查，定期验证当前显示的日期是否是今天
    const checkDateInterval = setInterval(() => {
      const today = getDateString();
      if (dashboard && dashboard.date !== today) {
        // 如果显示的日期不是今天，重新加载今天的数据
        loadDashboard();
      }
    }, 60000); // 每分钟检查一次
    
    // 页面可见时也检查日期和设置（例如从后台返回或从设置页返回时）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const today = getDateString();
        if (dashboard && dashboard.date !== today) {
          loadDashboard();
        } else {
          // 即使日期没变，也重新加载设置（可能从设置页返回）
          (async () => {
            try {
              const settings = await getSettings();
              if (settings) {
                setUseManualBMR(settings.bmrSettings?.useManualBMR ?? false);
              } else {
                setUseManualBMR(false);
              }
            } catch (error) {
              console.error('加载设置失败:', error);
              setUseManualBMR(false);
            }
          })();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(checkDateInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dashboard?.date]);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      // 确保总是获取今天的数据
      const today = getDateString();
      
      // 并行加载数据，提升性能
      // 注意：getDashboardData 内部会调用 getSettings，但由于缓存机制，不会重复读取
      const [data, settings] = await Promise.all([
        getDashboardData(today),
        getSettings(),
      ]);
      
      // 强制使用今天的日期，即使返回的数据日期不匹配
      // 这样可以确保始终显示今天的数据
      const displayData = {
        ...data,
        date: today
      };
      
      setDashboard(displayData);
      
      // 从 DailySummary 中读取营养信息（已持久化）
      // 如果 DailySummary 中没有营养信息，则从食物记录中计算（向后兼容）
      if (data.totalMacros) {
        setDailyMacros(data.totalMacros);
      } else {
        // 向后兼容：如果 DailySummary 中没有营养信息，从食物记录中计算
        const foodRecords = await getFoodDetails(today);
        const macros = foodRecords.reduce(
          (acc, record) => {
            // 如果记录有 totalMacros，直接使用；否则从 items 中计算
            let recordMacros = record.totalMacros;
            if (!recordMacros || typeof recordMacros !== 'object') {
              // 从 items 中计算
              recordMacros = record.items.reduce(
                (itemAcc, item) => ({
                  protein: itemAcc.protein + (item.macros?.protein || 0),
                  carbs: itemAcc.carbs + (item.macros?.carbs || 0),
                  fat: itemAcc.fat + (item.macros?.fat || 0),
                }),
                { protein: 0, carbs: 0, fat: 0 }
              );
            }
            return {
              carbs: acc.carbs + (recordMacros.carbs || 0),
              protein: acc.protein + (recordMacros.protein || 0),
              fat: acc.fat + (recordMacros.fat || 0),
            };
          },
          { carbs: 0, protein: 0, fat: 0 }
        );
        setDailyMacros(macros);
      }
      
      // 设置手动BMR模式
      if (settings) {
        setUseManualBMR(settings.bmrSettings?.useManualBMR ?? false);
      } else {
        // 如果设置不存在，确保使用自动计算模式
        setUseManualBMR(false);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      // 如果加载失败，确保使用自动计算模式
      setUseManualBMR(false);
      // 如果用户设置不存在，引导用户去设置
      if (error instanceof Error && error.message.includes('设置')) {
        // 可以显示提示或跳转到设置页
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateActiveCalories = async () => {
    if (!dashboard) return;
    const calories = parseInt(activeCaloriesInput);
    if (isNaN(calories) || calories < 0) return;

    try {
      const updated = await updateActiveEnergy(dashboard.date, calories);
      setDashboard(updated);
      setActiveCaloriesInput('');
      setIsEditingActive(false);
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const handleUpdateBMR = async () => {
    if (!dashboard) {
      alert('无法更新：仪表盘数据未加载');
      return;
    }
    
    // 只有在手动BMR模式下才允许更新
    if (!useManualBMR) {
      alert('当前不是手动BMR模式，无法更新基础代谢。请在设置中开启手动输入模式。');
      setIsEditingBMR(false);
      setBmrInput('');
      return;
    }
    
    // 检查输入是否为空
    if (!bmrInput || bmrInput.trim() === '') {
      alert('请输入基础代谢值');
      return;
    }
    
    const bmr = parseInt(bmrInput);
    if (isNaN(bmr)) {
      alert('请输入有效的数字');
      return;
    }
    
    if (bmr < 500 || bmr > 5000) {
      alert('基础代谢值应在 500-5000 kcal 之间');
      return;
    }

    try {
      const updated = await updateBMR(dashboard.date, bmr);
      setDashboard(updated);
      setBmrInput('');
      setIsEditingBMR(false);
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败，请重试');
    }
  };

  const handleCapture = async (image: string) => {
    if (!dashboard) return;

    // 如果已经有正在进行的分析，不允许新的分析
    if (isAnalyzing) {
      console.warn('已有正在进行的分析，请先取消或等待完成');
      return;
    }

    // 显示分析中通知（非阻塞）
    setAnalysisStatus('analyzing');
    setAnalysisMessage('AI 正在分析食物，完成后会自动更新...');

    // 创建 AbortController 用于取消请求
    const controller = new AbortController();
    setAbortController(controller);

    // 后台异步处理，不阻塞用户
    (async () => {
      try {
        // 获取 AI 配置
        const settings = await getSettings();
        if (!settings || !settings.aiConfig.apiKey) {
          setAnalysisStatus('error');
          setAnalysisMessage('请先在设置中配置 AI API Key');
          setAbortController(null);
          return;
        }

        // 调用 AI 分析 API
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.aiConfig.apiKey,
            'x-base-url': settings.aiConfig.baseUrl,
            'x-model': settings.aiConfig.model,
          },
          body: JSON.stringify({ image }),
          signal: controller.signal, // 添加取消信号
        });

        if (!response.ok) {
          // 尝试读取错误信息
          let errorMessage = 'AI 分析失败';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            errorMessage = `AI 分析失败 (状态码: ${response.status})`;
          }
          throw new Error(errorMessage);
        }

        // 解析流式响应
        const { parseStreamResponse } = await import('@/utils/stream');
        let jsonText: string;
        try {
          jsonText = await parseStreamResponse(response);
        } catch (streamError) {
          // 如果是取消操作，直接抛出
          if (streamError instanceof Error && streamError.name === 'AbortError') {
            throw streamError;
          }
          console.error('解析流式响应失败:', streamError);
          throw new Error('无法读取 AI 响应流，请检查网络连接');
        }

        if (!jsonText) {
          throw new Error('AI 返回了空响应，请重试');
        }

      let aiResult: AIAnalysisResult;
      try {
        aiResult = JSON.parse(jsonText);
        // 验证必要字段
        if (!aiResult.foods || !Array.isArray(aiResult.foods) || aiResult.foods.length === 0) {
          throw new Error('AI 返回的数据格式不完整：缺少 foods 数组');
        }
        // 验证每道菜的格式
        for (const food of aiResult.foods) {
          if (!food.name || typeof food.calories !== 'number') {
            throw new Error('AI 返回的数据格式不完整：食物信息缺失');
          }
        }
      } catch (parseError) {
        console.error('解析 AI 响应失败:', parseError);
        throw new Error(`AI 响应格式错误: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
      }

      // 保存食物记录
      const record = await addFoodRecord(dashboard.date, aiResult, image);
      
      // 重新加载仪表盘
      await loadDashboard();
      
        // 清除 AbortController
        setAbortController(null);

        // 显示成功通知
        const foodNames = aiResult.foods.map(f => f.name).join('、');
        setAnalysisStatus('success');
        setAnalysisMessage(`分析完成！已添加 ${foodNames} (共 ${record.totalCalories} kcal)`);
        
        // 5秒后自动关闭成功通知
        setTimeout(() => {
          setAnalysisStatus(null);
        }, 5000);
      } catch (error) {
        // 清除 AbortController
        setAbortController(null);

        // 如果是用户取消，不显示错误
        if (error instanceof Error && error.name === 'AbortError') {
          setAnalysisStatus(null);
          setAnalysisMessage('');
          return;
        }

        console.error('分析失败:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : '分析失败，请重试';
        
        // 显示错误通知
        setAnalysisStatus('error');
        setAnalysisMessage(errorMessage);
        
        // 10秒后自动关闭错误通知
        setTimeout(() => {
          setAnalysisStatus(null);
        }, 10000);
      }
    })();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-gray-400 mb-4">请先设置用户档案</div>
          <Link href="/settings">
            <motion.button
              className="btn-primary"
              whileTap={{ scale: 0.95 }}
            >
              前往设置
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  const netCalories = dashboard.netCalories;
  const isDeficit = netCalories >= dashboard.targetSnapshot;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between p-4 pt-12">
        <h1 className="text-2xl font-bold">KeepFit</h1>
        <div className="flex gap-3">
          <Link href="/details">
            <motion.button
              className="p-2 rounded-xl bg-card"
              whileTap={{ scale: 0.95 }}
            >
              <List className="w-5 h-5" />
            </motion.button>
          </Link>
          <Link href="/calendar">
            <motion.button
              className="p-2 rounded-xl bg-card"
              whileTap={{ scale: 0.95 }}
            >
              <Calendar className="w-5 h-5" />
            </motion.button>
          </Link>
          <Link href="/settings">
            <motion.button
              className="p-2 rounded-xl bg-card"
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </Link>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div 
        className="px-4 space-y-4"
        style={{ 
          marginTop: analysisStatus !== null && notificationHeight > 0 ? `${notificationHeight + 16}px` : '24px' 
        }}
      >
        {/* 热量赤字/盈余 */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* 左侧内容区域 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-400 mb-2">今日净消耗热量</div>
              <div className={`text-5xl font-bold ${isDeficit ? 'text-success' : 'text-warning'}`}>
                <CountUp value={Math.abs(netCalories)} decimals={0} />
                <span className="text-2xl ml-2">kcal</span>
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {isDeficit ? '✓ 达成目标赤字' : '⚠ 未达成目标'}
              </div>
            </div>
            {/* 目标达成圆环 - 相对于左侧所有内容垂直居中 */}
            <div className="flex-shrink-0 flex items-center">
              <CircularProgress
                value={netCalories}
                max={dashboard.targetSnapshot}
                size={70}
                strokeWidth={5}
              />
            </div>
          </div>
        </motion.div>

        {/* 统计卡片网格 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 基础代谢（根据设置决定是否可编辑） */}
          {useManualBMR ? (
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm text-gray-400">基础代谢</div>
                {!isEditingBMR ? (
                  <motion.button
                    className="text-xs text-gray-400 px-2 py-1 rounded-lg bg-card/50 hover:bg-card/70 transition-colors"
                    onClick={() => {
                      if (dashboard) {
                        setBmrInput(dashboard.bmr.toString() || '');
                        setIsEditingBMR(true);
                      }
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    编辑
                  </motion.button>
                ) : (
                  <div className="flex gap-1">
                    <motion.button
                      className="text-xs px-2 py-1 rounded-lg bg-success text-black font-semibold"
                      onClick={handleUpdateBMR}
                      whileTap={{ scale: 0.95 }}
                    >
                      保存
                    </motion.button>
                    <motion.button
                      className="text-xs px-2 py-1 rounded-lg bg-card text-gray-400"
                      onClick={() => {
                        setIsEditingBMR(false);
                        setBmrInput('');
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      取消
                    </motion.button>
                  </div>
                )}
              </div>
              {!isEditingBMR ? (
                <div className="text-3xl font-bold text-white">
                  <CountUp value={dashboard.bmr} decimals={0} />
                  <span className="text-lg ml-1">kcal</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="number"
                    value={bmrInput}
                    onChange={(e) => setBmrInput(e.target.value)}
                    placeholder="输入数值"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background text-white text-lg font-bold border border-gray-700 focus:border-success focus:outline-none"
                    autoFocus
                  />
                  <span className="text-lg text-gray-400 flex-shrink-0">kcal</span>
                </div>
              )}
            </motion.div>
          ) : (
            <StatCard
              label="基础代谢"
              value={dashboard.bmr}
              unit="kcal"
            />
          )}
          {/* 动态消耗（可编辑） */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm text-gray-400">动态消耗</div>
              {!isEditingActive ? (
                <motion.button
                  className="text-xs text-gray-400 px-2 py-1 rounded-lg bg-card/50 hover:bg-card/70 transition-colors"
                  onClick={() => setIsEditingActive(true)}
                  whileTap={{ scale: 0.95 }}
                >
                  编辑
                </motion.button>
              ) : (
                <div className="flex gap-1">
                  <motion.button
                    className="text-xs px-2 py-1 rounded-lg bg-success text-black font-semibold"
                    onClick={handleUpdateActiveCalories}
                    whileTap={{ scale: 0.95 }}
                  >
                    保存
                  </motion.button>
                  <motion.button
                    className="text-xs px-2 py-1 rounded-lg bg-card text-gray-400"
                    onClick={() => {
                      setIsEditingActive(false);
                      setActiveCaloriesInput('');
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    取消
                  </motion.button>
                </div>
              )}
            </div>
            {!isEditingActive ? (
              <div className="text-3xl font-bold text-white">
                <CountUp value={dashboard.activeCalories} decimals={0} />
                <span className="text-lg ml-1">kcal</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  value={activeCaloriesInput}
                  onChange={(e) => setActiveCaloriesInput(e.target.value)}
                  placeholder="输入数值"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background text-white text-lg font-bold border border-gray-700 focus:border-success focus:outline-none"
                  autoFocus
                />
                <span className="text-lg text-gray-400 flex-shrink-0">kcal</span>
              </div>
            )}
          </motion.div>
          <StatCard
            label="总消耗"
            value={dashboard.totalBurn}
            unit="kcal"
          />
          <StatCard
            label="总摄入"
            value={dashboard.totalIntake}
            unit="kcal"
          />
        </div>

        {/* 当天摄入营养 */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-sm text-gray-400 mb-4">当天摄入营养</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
                <Cookie className="w-4 h-4" />
                <span>碳水</span>
              </div>
              <div className="text-3xl font-bold text-white">
                <CountUp value={dailyMacros.carbs} decimals={1} />
                <span className="text-lg ml-1">g</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
                <Egg className="w-4 h-4" />
                <span>蛋白质</span>
              </div>
              <div className="text-3xl font-bold text-white">
                <CountUp value={dailyMacros.protein} decimals={1} />
                <span className="text-lg ml-1">g</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
                <Droplet className="w-4 h-4" />
                <span>脂肪</span>
              </div>
              <div className="text-3xl font-bold text-white">
                <CountUp value={dailyMacros.fat} decimals={1} />
                <span className="text-lg ml-1">g</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 拍摄按钮（固定在底部） */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-gray-800">
        <CameraButton onCapture={handleCapture} />
      </div>
    </div>
  );
}

