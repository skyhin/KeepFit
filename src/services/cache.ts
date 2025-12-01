import type { DailySummary, UserSettings } from '@/types';
import { getDateString } from './db';

/**
 * 内存缓存服务
 * 用于提升首页数据加载速度
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  date?: string; // 对于日期相关的数据，记录日期用于失效检查
}

class CacheService {
  private dashboardCache: Map<string, CacheEntry<DailySummary>> = new Map();
  private settingsCache: CacheEntry<UserSettings> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存时间

  /**
   * 获取缓存的仪表盘数据
   */
  getDashboard(date: string): DailySummary | null {
    const entry = this.dashboardCache.get(date);
    if (!entry) return null;

    // 检查缓存是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.dashboardCache.delete(date);
      return null;
    }

    // 检查日期是否匹配（防止跨天缓存问题）
    if (entry.date && entry.date !== date) {
      this.dashboardCache.delete(entry.date);
      return null;
    }

    return entry.data;
  }

  /**
   * 设置仪表盘数据缓存
   */
  setDashboard(date: string, data: DailySummary): void {
    this.dashboardCache.set(date, {
      data,
      timestamp: Date.now(),
      date,
    });
  }

  /**
   * 获取缓存的设置数据
   */
  getSettings(): UserSettings | null {
    if (!this.settingsCache) return null;

    // 检查缓存是否过期
    const now = Date.now();
    if (now - this.settingsCache.timestamp > this.CACHE_TTL) {
      this.settingsCache = null;
      return null;
    }

    return this.settingsCache.data;
  }

  /**
   * 设置设置数据缓存
   */
  setSettings(data: UserSettings): void {
    this.settingsCache = {
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 清除指定日期的仪表盘缓存
   */
  invalidateDashboard(date: string): void {
    this.dashboardCache.delete(date);
  }

  /**
   * 清除所有仪表盘缓存
   */
  invalidateAllDashboards(): void {
    this.dashboardCache.clear();
  }

  /**
   * 清除设置缓存
   */
  invalidateSettings(): void {
    this.settingsCache = null;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.dashboardCache.clear();
    this.settingsCache = null;
  }

  /**
   * 清除过期的缓存（自动清理）
   */
  cleanup(): void {
    const now = Date.now();
    const today = getDateString();

    // 清理过期的仪表盘缓存
    for (const [date, entry] of this.dashboardCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL || (entry.date && entry.date !== date)) {
        this.dashboardCache.delete(date);
      }
    }

    // 清理过期的设置缓存
    if (this.settingsCache && now - this.settingsCache.timestamp > this.CACHE_TTL) {
      this.settingsCache = null;
    }
  }
}

// 导出单例
export const cache = new CacheService();

// 定期清理过期缓存（每10分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

