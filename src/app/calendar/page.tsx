'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMonthlyStats } from '@/services/daily';
import type { MonthlyStat } from '@/types';
import { useAnalysis } from '@/contexts/AnalysisContext';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { analysisStatus, notificationHeight } = useAnalysis();
  const router = useRouter();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    loadStats();
  }, [year, month]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await getMonthlyStats(year, month);
      setStats(data);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 生成日历网格
  const getCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: number; stat: MonthlyStat | null }> = [];

    // 填充前面的空白
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: 0, stat: null });
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stat = stats.find((s) => s.date === dateStr) || null;
      days.push({ date: day, stat });
    }

    return days;
  };

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 p-4 pt-12">
        <Link href="/">
          <motion.button
            className="p-2 rounded-xl bg-card"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </Link>
        <h1 className="text-2xl font-bold">日历</h1>
      </div>

      <div 
        className="px-4"
        style={{ 
          marginTop: analysisStatus !== null && notificationHeight > 0 ? `${notificationHeight + 16}px` : '24px' 
        }}
      >
        {/* 月份导航 */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <motion.button
              className="p-2 rounded-lg bg-background"
              onClick={goToPreviousMonth}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <div className="text-xl font-semibold">
              {year}年 {monthNames[month - 1]}
            </div>
            <motion.button
              className="p-2 rounded-lg bg-background"
              onClick={goToNextMonth}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
          <motion.button
            className="w-full py-2 rounded-lg bg-card text-sm text-gray-400"
            onClick={goToToday}
            whileTap={{ scale: 0.95 }}
          >
            回到今天
          </motion.button>
        </div>

        {/* 日历网格 */}
        <div className="card">
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">加载中...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {getCalendarDays().map((item, index) => {
                if (item.date === 0) {
                  return <div key={index} className="aspect-square" />;
                }

                const isToday =
                  item.date === new Date().getDate() &&
                  month === new Date().getMonth() + 1 &&
                  year === new Date().getFullYear();

                const isSuccess = item.stat?.isSuccess ?? false;
                const hasData = item.stat !== null;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(item.date).padStart(2, '0')}`;

                const handleDateClick = () => {
                  router.push(`/details?date=${dateStr}&from=calendar`);
                };

                return (
                  <motion.div
                    key={index}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center p-1 cursor-pointer ${
                      isToday
                        ? 'bg-white text-black'
                        : hasData
                        ? isSuccess
                          ? 'bg-success/20 border border-success/50'
                          : 'bg-warning/20 border border-warning/50'
                        : 'bg-card'
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDateClick}
                  >
                    <div className={`text-sm font-semibold ${isToday ? 'text-black' : 'text-white'}`}>
                      {item.date}
                    </div>
                    {hasData && (
                      <div className={`text-xs mt-1 ${isSuccess ? 'text-success' : 'text-warning'}`}>
                        {isSuccess ? '✓' : '⚠'}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 图例 */}
        <div className="card mt-4">
          <div className="text-sm text-gray-400 mb-3">图例</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-success/20 border border-success/50 flex items-center justify-center">
                <span className="text-xs text-success">✓</span>
              </div>
              <span className="text-sm">达成目标赤字</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-warning/20 border border-warning/50 flex items-center justify-center">
                <span className="text-xs text-warning">⚠</span>
              </div>
              <span className="text-sm">未达成目标</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-card" />
              <span className="text-sm text-gray-400">无数据</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



