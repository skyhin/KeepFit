import { get, set, entries, del, clear } from 'idb-keyval';

// IndexedDB Store 键名常量
export const DB_KEYS = {
  USER_SETTINGS: 'USER_SETTINGS',
  DAILY_SUMMARY_PREFIX: 'daily_',
  FOOD_RECORD_PREFIX: 'food_',
} as const;

// 工具函数：生成日期字符串（使用本地时区）
export function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 工具函数：生成每日汇总键
export function getDailySummaryKey(date: string): string {
  return `${DB_KEYS.DAILY_SUMMARY_PREFIX}${date}`;
}

// 工具函数：生成食物记录键
export function getFoodRecordKey(id: string): string {
  return `${DB_KEYS.FOOD_RECORD_PREFIX}${id}`;
}

// 工具函数：判断是否为每日汇总键
export function isDailySummaryKey(key: string): boolean {
  return key.startsWith(DB_KEYS.DAILY_SUMMARY_PREFIX);
}

// 工具函数：判断是否为食物记录键
export function isFoodRecordKey(key: string): boolean {
  return key.startsWith(DB_KEYS.FOOD_RECORD_PREFIX);
}

// 工具函数：从键中提取日期
export function extractDateFromKey(key: string): string | null {
  if (isDailySummaryKey(key)) {
    return key.replace(DB_KEYS.DAILY_SUMMARY_PREFIX, '');
  }
  return null;
}

// 工具函数：从键中提取记录 ID
export function extractIdFromKey(key: string): string | null {
  if (isFoodRecordKey(key)) {
    return key.replace(DB_KEYS.FOOD_RECORD_PREFIX, '');
  }
  return null;
}

// 通用 DB 操作封装
export const db = {
  get,
  set,
  entries,
  del,
  clear,
};

