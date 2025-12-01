// Store A: user_settings
export interface UserSettings {
  profile: {
    gender: 'male' | 'female';
    age: number;
    height: number; // cm
    weight: number; // kg
    updatedAt: number; // 时间戳
  };
  computed: {
    bmr: number; // 基础代谢率 (Mifflin-St Jeor 公式 或 手动输入)
  };
  goals: {
    targetDeficit: number; // 目标赤字 (如 500 kcal)
  };
  aiConfig: {
    apiKey: string;
    baseUrl: string; // 默认: https://api.openai.com/v1
    model: string;   // 默认: gpt-4o
  };
  bmrSettings: {
    useManualBMR: boolean; // 是否使用手动输入BMR
  };
}

// Store B: daily_summary
export interface DailySummary {
  date: string;           // 主键 "2024-11-29"
  bmr: number;            // 当天的 BMR 快照
  activeCalories: number; // 动态消耗 (Apple Watch 红环数据)
  totalIntake: number;    // 摄入总热量
  totalBurn: number;      // = bmr + activeCalories
  netCalories: number;    // = totalBurn - totalIntake (正数=赤字，负数=盈余)
  targetSnapshot: number; // 当天的目标赤字快照
  totalMacros: {          // 每日总营养素
    protein: number;      // 蛋白质（克）
    carbs: number;        // 碳水化合物（克）
    fat: number;          // 脂肪（克）
  };
}

// 单道菜信息
export interface FoodItem {
  name: string;           // "米饭"
  estimatedWeight: string; // "150g"
  calories: number;       // 热量
  macros: {
    protein: number;      // 蛋白质（克）
    carbs: number;        // 碳水化合物（克）
    fat: number;          // 脂肪（克）
  };
  tips?: string;          // 健康建议（可选）
}

// Store C: food_records (一餐记录，包含一张图片和多道菜)
export interface FoodRecord {
  id: string;             // UUID
  date: string;           // "2024-11-29"
  timestamp: number;      // 排序用
  thumbnail: string;      // Base64 字符串 (宽 200px, 质量 0.5)
  
  // 一餐中的多道菜
  items: FoodItem[];      // 多道菜的数组
  
  // 总计（冗余存储，便于查询）
  totalCalories: number;  // 总热量
  totalMacros: {          // 总营养素
    protein: number;
    carbs: number;
    fat: number;
  };
}

// AI 分析结果（返回多道菜）
export interface AIAnalysisResult {
  foods: FoodItem[];      // 多道菜的数组
  tips?: string;          // 整体健康建议（可选）
}

// 月度统计
export interface MonthlyStat {
  date: string;
  netCalories: number;
  targetSnapshot: number;
  isSuccess: boolean; // netCalories >= targetSnapshot
}

