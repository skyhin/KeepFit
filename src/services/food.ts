import { v4 as uuidv4 } from 'uuid';
import { db, getFoodRecordKey, isFoodRecordKey } from './db';
import { updateDailySummary } from './daily';
import type { FoodRecord, AIAnalysisResult } from '@/types';

/**
 * 压缩图片为缩略图 (Base64)
 */
async function compressImageToThumbnail(
  highResImage: string,
  maxWidth: number = 200,
  quality: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', quality);
      resolve(thumbnail);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = highResImage;
  });
}

/**
 * 添加食物记录（核心事务）
 * 1. 压缩图片
 * 2. 计算总热量和总营养素
 * 3. 写入明细
 * 4. 更新每日汇总
 */
export async function addFoodRecord(
  date: string,
  aiResult: AIAnalysisResult,
  highResImage: string
): Promise<FoodRecord> {
  // 1. 压缩图片
  const thumbnail = await compressImageToThumbnail(highResImage);

  // 2. 计算总热量和总营养素
  const totalCalories = aiResult.foods.reduce((sum, food) => sum + food.calories, 0);
  const totalMacros = aiResult.foods.reduce(
    (acc, food) => ({
      protein: acc.protein + food.macros.protein,
      carbs: acc.carbs + food.macros.carbs,
      fat: acc.fat + food.macros.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  // 3. 创建记录
  const record: FoodRecord = {
    id: `record_${Date.now()}_${uuidv4()}`,
    date,
    timestamp: Date.now(),
    thumbnail,
    items: aiResult.foods,
    totalCalories,
    totalMacros,
  };

  // 4. 写入明细
  const recordKey = getFoodRecordKey(record.id);
  await db.set(recordKey, record);

  // 5. 更新每日汇总（事务性）
  await updateDailySummary(date, (summary) => {
    summary.totalIntake += totalCalories;
    summary.netCalories = summary.totalBurn - summary.totalIntake;
    // 更新营养信息
    if (!summary.totalMacros) {
      summary.totalMacros = { protein: 0, carbs: 0, fat: 0 };
    }
    summary.totalMacros.protein += totalMacros.protein;
    summary.totalMacros.carbs += totalMacros.carbs;
    summary.totalMacros.fat += totalMacros.fat;
    return summary;
  });

  return record;
}

/**
 * 获取某天的所有食物详情（带图）
 */
export async function getFoodDetails(date: string): Promise<FoodRecord[]> {
  const allEntries = await db.entries();
  const records: FoodRecord[] = [];

  for (const [key, value] of allEntries) {
    const keyStr = String(key);
    if (isFoodRecordKey(keyStr) && typeof value === 'object') {
      const record = value as FoodRecord;
      if (record.date === date) {
        records.push(record);
      }
    }
  }

  // 按时间戳倒序排序（最新的在前）
  records.sort((a, b) => b.timestamp - a.timestamp);

  return records;
}

/**
 * 删除食物记录
 */
export async function deleteFoodRecord(recordId: string): Promise<void> {
  const recordKey = getFoodRecordKey(recordId);
  const record = await db.get<FoodRecord>(recordKey);

  if (!record) {
    throw new Error('记录不存在');
  }

  // 删除记录
  await db.del(recordKey);

  // 更新每日汇总（减去该记录的总热量和营养信息）
  await updateDailySummary(record.date, (summary) => {
    summary.totalIntake = Math.max(0, summary.totalIntake - record.totalCalories);
    summary.netCalories = summary.totalBurn - summary.totalIntake;
    // 减去营养信息
    if (summary.totalMacros) {
      summary.totalMacros.protein = Math.max(0, summary.totalMacros.protein - record.totalMacros.protein);
      summary.totalMacros.carbs = Math.max(0, summary.totalMacros.carbs - record.totalMacros.carbs);
      summary.totalMacros.fat = Math.max(0, summary.totalMacros.fat - record.totalMacros.fat);
    }
    return summary;
  });
}

