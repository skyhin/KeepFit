'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getFoodDetails, deleteFoodRecord } from '@/services/food';
import { getDateString } from '@/services/db';
import type { FoodRecord } from '@/types';
import { useAnalysis } from '@/contexts/AnalysisContext';

export default function DetailsPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const fromParam = searchParams.get('from');
  const [date, setDate] = useState(dateParam || getDateString());
  
  // 根据来源决定返回链接
  const backHref = fromParam === 'calendar' ? '/calendar' : '/';
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { analysisStatus, notificationHeight } = useAnalysis();

  // 当 URL 参数变化时，更新日期
  useEffect(() => {
    if (dateParam) {
      setDate(dateParam);
    }
  }, [dateParam]);

  useEffect(() => {
    loadDetails();
  }, [date]);

  const loadDetails = async () => {
    try {
      setIsLoading(true);
      const data = await getFoodDetails(date);
      setRecords(data);
    } catch (error) {
      console.error('加载详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      await deleteFoodRecord(recordId);
      await loadDetails();
      // 删除成功后，刷新当前页面的数据，继续停留在用餐明细页
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 p-4 pt-12">
        <Link href={backHref}>
          <motion.button
            className="p-2 rounded-xl bg-card"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </Link>
        <h1 className="text-2xl font-bold">食物记录</h1>
      </div>

      {/* 日期选择 */}
      <div 
        className="px-4"
        style={{ 
          marginTop: analysisStatus !== null && notificationHeight > 0 ? `${notificationHeight + 16}px` : '16px' 
        }}
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-card text-white border border-gray-700"
        />
      </div>

      {/* 记录列表 */}
      <div className="px-4 mt-6 space-y-4 pb-24">
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">加载中...</div>
        ) : records.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="mb-2">暂无记录</div>
            <div className="text-sm">使用首页的拍摄功能添加食物记录</div>
          </div>
        ) : (
          records.map((record) => (
            <motion.div
              key={record.id}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex gap-4 mb-4">
                {/* 缩略图 */}
                <div className="flex-shrink-0">
                  <img
                    src={record.thumbnail}
                    alt="餐食图片"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                </div>

                {/* 总计信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">一餐</h3>
                      <div className="text-sm text-gray-400">
                        {formatTime(record.timestamp)}
                      </div>
                    </div>
                    <motion.button
                      className="p-1 rounded-lg text-gray-400 hover:text-warning flex-shrink-0"
                      onClick={() => handleDelete(record.id)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <div className="text-xl font-bold text-success mb-2">
                    {record.totalCalories} <span className="text-sm text-gray-400">kcal</span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>蛋白质: {record.totalMacros.protein.toFixed(1)}g</span>
                    <span>碳水: {record.totalMacros.carbs.toFixed(1)}g</span>
                    <span>脂肪: {record.totalMacros.fat.toFixed(1)}g</span>
                  </div>
                </div>
              </div>

              {/* 每道菜的明细 */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="text-sm text-gray-400 mb-3">菜品明细：</div>
                <div className="space-y-3">
                  {record.items.map((item, index) => (
                    <div key={index} className="bg-background rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.estimatedWeight}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-success font-semibold">
                            {item.calories} <span className="text-xs text-gray-400">kcal</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400 mt-2">
                        <span>蛋白质: {item.macros.protein.toFixed(1)}g</span>
                        <span>碳水: {item.macros.carbs.toFixed(1)}g</span>
                        <span>脂肪: {item.macros.fat.toFixed(1)}g</span>
                      </div>
                      {item.tips && (
                        <div className="text-xs text-gray-500 mt-2 italic">
                          💡 {item.tips}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

