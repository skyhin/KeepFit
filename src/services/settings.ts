import { db, DB_KEYS, getDailySummaryKey, getDateString } from './db';
import { cache } from './cache';
import type { UserSettings, DailySummary } from '@/types';

/**
 * 使用 Mifflin-St Jeor 公式计算 BMR
 * BMR (男性) = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄(岁) + 5
 * BMR (女性) = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄(岁) - 161
 */
export function calculateBMR(
  gender: 'male' | 'female',
  weight: number,
  height: number,
  age: number
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * 保存用户档案并自动更新 BMR
 */
export async function saveUserProfile(
  profile: {
    gender: 'male' | 'female';
    age: number;
    height: number;
    weight: number;
  },
  targetDeficit?: number,
  useManualBMR?: boolean,
  manualBMR?: number
): Promise<void> {
  const existing = await db.get<UserSettings>(DB_KEYS.USER_SETTINGS);
  
  // 如果使用手动BMR，使用手动输入的值；否则使用公式计算
  let bmr: number;
  if (useManualBMR !== undefined && useManualBMR && manualBMR !== undefined) {
    bmr = manualBMR;
  } else if (existing?.bmrSettings?.useManualBMR && existing?.computed?.bmr) {
    // 保持现有的手动BMR
    bmr = existing.computed.bmr;
  } else {
    // 使用公式计算
    bmr = calculateBMR(profile.gender, profile.weight, profile.height, profile.age);
  }
  
  const settings: UserSettings = {
    profile: {
      ...profile,
      updatedAt: Date.now(),
    },
    computed: {
      bmr: Math.round(bmr),
    },
    goals: {
      targetDeficit: targetDeficit ?? existing?.goals.targetDeficit ?? 500,
    },
    aiConfig: existing?.aiConfig ?? {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    },
    bmrSettings: {
      useManualBMR: useManualBMR ?? existing?.bmrSettings?.useManualBMR ?? false,
    },
  };

  await db.set(DB_KEYS.USER_SETTINGS, settings);
  // 清除设置缓存
  cache.invalidateSettings();
}

/**
 * 更新BMR设置，并在切换时保存当天的基础代谢数据
 */
export async function updateBMRSettings(useManualBMR: boolean): Promise<void> {
  const existing = await getSettings();
  if (!existing) {
    throw new Error('用户设置不存在，请先创建用户档案');
  }

  const oldUseManualBMR = existing.bmrSettings?.useManualBMR ?? false;
  
  // 如果从手动切换到自动，使用公式重新计算BMR
  let newBMR = existing.computed.bmr;
  if (oldUseManualBMR && !useManualBMR) {
    // 从手动切换到自动，使用公式重新计算
    newBMR = calculateBMR(
      existing.profile.gender,
      existing.profile.weight,
      existing.profile.height,
      existing.profile.age
    );
  }

  // 如果BMR计算方式发生了变化，需要保存当天的基础代谢数据
  if (oldUseManualBMR !== useManualBMR) {
    const today = getDateString();
    const key = getDailySummaryKey(today);
    const todaySummary = await db.get<DailySummary>(key);
    
    if (todaySummary) {
      // 保存当前的BMR到当天的记录中
      todaySummary.bmr = existing.computed.bmr;
      // 重新计算总消耗和净消耗
      todaySummary.totalBurn = todaySummary.bmr + todaySummary.activeCalories;
      todaySummary.netCalories = todaySummary.totalBurn - todaySummary.totalIntake;
      await db.set(key, todaySummary);
    }
  }

  // 更新设置
  existing.bmrSettings = {
    useManualBMR,
  };
  existing.computed.bmr = Math.round(newBMR);
  
  await db.set(DB_KEYS.USER_SETTINGS, existing);
  // 清除设置缓存和当天的仪表盘缓存
  cache.invalidateSettings();
  cache.invalidateDashboard(getDateString());
}

/**
 * 获取全局配置
 * 使用缓存机制提升性能
 */
export async function getSettings(): Promise<UserSettings | null> {
  // 先尝试从缓存获取
  const cached = cache.getSettings();
  if (cached) {
    return cached;
  }

  const settings = await db.get<UserSettings>(DB_KEYS.USER_SETTINGS);
  // 更新缓存
  if (settings) {
    cache.setSettings(settings);
  }
  return settings;
}

/**
 * 更新 AI 配置
 */
export async function updateAIConfig(config: Partial<UserSettings['aiConfig']>): Promise<void> {
  const existing = await getSettings();
  if (!existing) {
    throw new Error('用户设置不存在，请先创建用户档案');
  }

  existing.aiConfig = {
    ...existing.aiConfig,
    ...config,
  };

  await db.set(DB_KEYS.USER_SETTINGS, existing);
  // 清除设置缓存
  cache.invalidateSettings();
}

