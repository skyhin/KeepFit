import { db, getDailySummaryKey, getDateString, isDailySummaryKey } from './db';
import { getSettings } from './settings';
import { cache } from './cache';
import type { DailySummary, MonthlyStat } from '@/types';

/**
 * 获取首页仪表盘数据
 * 如果当天没有记录，自动创建初始化的 DailySummary
 * 使用缓存机制提升性能
 */
export async function getDashboardData(date: string = getDateString()): Promise<DailySummary> {
  // 先尝试从缓存获取
  const cached = cache.getDashboard(date);
  if (cached) {
    return cached;
  }

  const key = getDailySummaryKey(date);
  let summary = await db.get<DailySummary>(key);
  const settings = await getSettings();
  
  if (!settings) {
    throw new Error('请先设置用户档案');
  }

  if (!summary) {
    // 首次打开，创建初始化记录
    summary = {
      date,
      bmr: settings.computed.bmr,
      activeCalories: 0,
      totalIntake: 0,
      totalBurn: settings.computed.bmr,
      netCalories: settings.computed.bmr - 0, // totalBurn - totalIntake
      targetSnapshot: settings.goals.targetDeficit,
      totalMacros: {
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    };

    await db.set(key, summary);
  } else {
    // 向后兼容：如果旧的记录没有 totalMacros 字段，初始化它
    const needsMacrosInit = !summary.totalMacros;
    if (needsMacrosInit) {
      summary.totalMacros = {
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }
    // 检查是否需要更新
    const needsUpdate = needsMacrosInit || summary.date !== date || summary.targetSnapshot !== settings.goals.targetDeficit;
    
    // 确保日期字段始终与传入的日期参数匹配
    // 如果日期不匹配，说明可能是旧的记录，需要更新日期
    if (summary.date !== date) {
      summary.date = date;
    }
    
    // 如果目标赤字已更改，更新当天的 targetSnapshot
    // 这样可以确保显示的是最新的目标值
    if (summary.targetSnapshot !== settings.goals.targetDeficit) {
      summary.targetSnapshot = settings.goals.targetDeficit;
    }
    
    // 如果有任何更新，保存到数据库
    if (needsUpdate) {
      await db.set(key, summary);
    }
  }

  // 更新缓存
  cache.setDashboard(date, summary);
  return summary;
}

/**
 * 更新 Apple Watch 红环数据（动态消耗）
 */
export async function updateActiveEnergy(
  date: string,
  calories: number
): Promise<DailySummary> {
  const key = getDailySummaryKey(date);
  const summary = await db.get<DailySummary>(key);

  if (!summary) {
    // 如果当天记录不存在，先创建
    return await getDashboardData(date).then((s) => {
      return updateActiveEnergy(date, calories);
    });
  }

  summary.activeCalories = calories;
  summary.totalBurn = summary.bmr + calories;
  summary.netCalories = summary.totalBurn - summary.totalIntake;

  await db.set(key, summary);
  // 更新缓存
  cache.setDashboard(date, summary);
  return summary;
}

/**
 * 更新基础代谢（BMR）
 */
export async function updateBMR(
  date: string,
  bmr: number
): Promise<DailySummary> {
  const key = getDailySummaryKey(date);
  const summary = await db.get<DailySummary>(key);

  if (!summary) {
    // 如果当天记录不存在，先创建
    return await getDashboardData(date).then((s) => {
      return updateBMR(date, bmr);
    });
  }

  summary.bmr = bmr;
  summary.totalBurn = summary.bmr + summary.activeCalories;
  summary.netCalories = summary.totalBurn - summary.totalIntake;

  await db.set(key, summary);
  // 更新缓存
  cache.setDashboard(date, summary);
  return summary;
}

/**
 * 获取月度统计（用于日历视图）
 */
export async function getMonthlyStats(
  year: number,
  month: number
): Promise<MonthlyStat[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const allEntries = await db.entries();

  const stats: MonthlyStat[] = [];

  for (const [key, value] of allEntries) {
    const keyStr = String(key);
    if (isDailySummaryKey(keyStr) && typeof value === 'object') {
      const summary = value as DailySummary;
      if (summary.date.startsWith(prefix)) {
        stats.push({
          date: summary.date,
          netCalories: summary.netCalories,
          targetSnapshot: summary.targetSnapshot,
          isSuccess: summary.netCalories >= summary.targetSnapshot,
        });
      }
    }
  }

  // 按日期排序
  stats.sort((a, b) => a.date.localeCompare(b.date));

  return stats;
}

/**
 * 更新每日汇总（内部使用，由 food.ts 调用）
 */
export async function updateDailySummary(
  date: string,
  updateFn: (summary: DailySummary) => DailySummary
): Promise<DailySummary> {
  const key = getDailySummaryKey(date);
  let summary = await db.get<DailySummary>(key);

  if (!summary) {
    summary = await getDashboardData(date);
  }

  summary = updateFn(summary);
  await db.set(key, summary);
  // 更新缓存
  cache.setDashboard(date, summary);
  return summary;
}

