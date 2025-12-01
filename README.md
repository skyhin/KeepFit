# KeepFit - AI 热量追踪 App

一个基于 Next.js 14+ 的移动端 Web App，通过 AI 视觉识别食物热量，结合 Apple Watch 的消耗数据，实时计算并展示每日的热量赤字情况。

## 技术栈

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS (Mobile-first)
- **Animation**: Framer Motion
- **State Management**: React Context API (分析状态管理)
- **Storage**: IndexedDB (idb-keyval)
- **AI SDK**: Vercel AI SDK (ai package)
- **Icons**: Lucide React
- **Runtime**: Vercel Edge Functions
- **Stream Processing**: 自定义流式响应解析工具

## 设计系统

- **风格**: Apple Health 极简深色模式 (Dark Mode Only)
- **配色**: 
  - 背景: `#000000`
  - 卡片: `#1C1C1E`
  - 赤字(健康): `#30D158`
  - 盈余(警告): `#FF453A`
- **交互**: 
  - 按钮点击: `scale: 0.95` 回弹效果
  - 数字变化: CountUp 滚动动画（带小数位支持）
  - 页面切换: 平滑的 Slide Over 效果
  - 进度展示: 圆形进度条动画，支持多圈显示
  - 通知系统: 全局通知栏，支持自动消失和手动取消

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # AI 视觉分析 API (Edge Runtime)
│   ├── calendar/
│   │   └── page.tsx              # 日历视图页面
│   ├── details/
│   │   └── page.tsx              # 食物记录详情页
│   ├── settings/
│   │   └── page.tsx              # 用户设置页面
│   ├── layout.tsx                # 根布局（包含全局状态提供者）
│   ├── page.tsx                  # 首页仪表盘
│   └── globals.css               # 全局样式
├── components/
│   ├── CameraButton.tsx          # 相机按钮组件
│   ├── CountUp.tsx               # 数字滚动动画组件
│   ├── StatCard.tsx              # 统计卡片组件
│   ├── CircularProgress.tsx      # 圆形进度条组件（目标达成可视化）
│   ├── AnalysisNotification.tsx  # 分析状态通知组件
│   └── GlobalAnalysisNotification.tsx  # 全局分析通知组件
├── contexts/
│   └── AnalysisContext.tsx       # AI 分析状态管理上下文
├── services/
│   ├── db.ts                     # IndexedDB 工具函数
│   ├── cache.ts                  # 内存缓存服务（提升性能）
│   ├── settings.ts               # 用户设置服务
│   ├── daily.ts                  # 每日记录服务
│   └── food.ts                   # 食物记录服务
├── types/
│   └── index.ts                  # TypeScript 类型定义
└── utils/
    └── stream.ts                 # 流式响应解析工具

```

## 数据架构

### Store A: user_settings (用户配置)
- Key: `USER_SETTINGS`
- 存储用户基础信息、计算基准和 API 配置

### Store B: daily_summary (每日总览)
- Key: `daily_YYYY-MM-DD`
- 存储每日汇总数据，不含图片

### Store C: food_records (食物明细)
- Key: `food_record_${timestamp}_${uuid}`
- 存储每一餐的详细信息，包含缩略图

## 功能特性

### 1. 首页仪表盘
- 实时显示今日净热量（赤字/盈余）
- **圆形进度条**：可视化展示目标达成情况（支持多圈进度显示，Apple Watch 风格）
- 基础代谢率 (BMR) 显示（支持自动计算或手动输入模式）
- 动态消耗（Apple Watch 红环数据）可编辑输入
- 总消耗和总摄入统计
- **营养成分追踪**：实时显示当日摄入的碳水化合物、蛋白质、脂肪（带图标和动画）
- 一键拍摄食物进行 AI 分析
- **实时分析通知**：分析过程中显示状态通知，支持取消操作
- **流式响应处理**：实时显示 AI 分析进度，提升用户体验
- **智能缓存机制**：5分钟内存缓存，提升数据加载速度

### 2. 设置页面
- 身体档案设置（性别、年龄、身高、体重）
- **BMR 计算模式**：
  - 自动计算模式：使用 Mifflin-St Jeor 公式自动计算基础代谢率
  - 手动输入模式：允许用户手动设置 BMR 值（适合有专业测试数据的用户）
- 目标赤字设定
- AI 配置 (BYOK - Bring Your Own Key)

### 3. 日历视图
- 月度达标情况统计
- 可视化日历展示
- 每日达标状态标记

### 4. 食物记录详情
- 查看某天的所有进食记录
- 显示食物缩略图（压缩存储，节省空间）
- 显示每餐总热量和营养素信息（蛋白质、碳水化合物、脂肪）
- 显示每道菜的详细营养成分
- 支持删除记录（删除后自动更新每日汇总）

### 5. AI 分析功能
- **流式响应处理**：支持 AI 返回的流式数据，实时反馈分析进度
- **可取消分析**：用户可以在分析过程中随时取消请求（避免浪费 API 调用）
- **状态通知系统**：全局通知显示分析状态（分析中/成功/失败），支持自动消失和手动关闭
- **多道菜识别**：一次分析可识别多道菜品及其营养成分（热量、蛋白质、碳水化合物、脂肪）
- **智能图片压缩**：自动压缩上传图片（最大 1MB，1024px），提升上传速度和 API 响应速度
- **错误处理**：完善的错误提示和处理机制，友好的用户反馈

## 安装和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 使用说明

1. **首次使用**：
   - 打开应用后，首先需要前往设置页面配置用户档案
   - 输入性别、年龄、身高、体重等信息
   - 设置目标赤字（建议 300-500 kcal/天）
   - 配置 AI API Key（支持 OpenAI 或兼容的 API）

2. **日常使用**：
   - 在首页查看今日热量赤字情况（圆形进度条直观显示目标达成度，支持多圈显示）
   - 查看当日营养成分摄入情况（碳水化合物、蛋白质、脂肪）
   - 点击"编辑"按钮输入 Apple Watch 的动态消耗数据
   - 如果开启了手动 BMR 模式，可以点击"编辑"按钮手动调整基础代谢率
   - 点击"拍摄食物"按钮，选择或拍摄食物照片
   - AI 会自动分析食物并计算热量和营养成分（分析过程中会显示通知，可随时取消）
   - 分析完成后会自动更新仪表盘数据（包括热量和营养成分）
   - 查看详情页可以回顾所有进食记录（包含图片和每道菜的详细营养成分）
   - 查看日历页可以了解月度达标情况

## API 配置 (BYOK - 自带密钥)

**完全支持用户自定义 AI 服务商和模型**，只需在设置页面配置：

### 支持的配置项

1. **API Key**: 从任意 AI 服务商获取
2. **Base URL**: 服务商的 API 端点地址
3. **模型名称**: 支持视觉识别的模型名称

### 兼容性说明

只要服务商的 API **兼容 OpenAI 的格式**，都可以使用，包括但不限于：

- **OpenAI**: 
  - Base URL: `https://api.openai.com/v1`
  - 模型: `gpt-4o`, `gpt-4-vision-preview`, `gpt-4o-mini` 等
  
- **阿里云通义千问**: 
  - Base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
  - 模型: `qwen-vl-max`, `qwen-vl-plus` 等
  
- **其他兼容 OpenAI 格式的服务**:
  - 自定义代理服务
  - 其他云服务商的 OpenAI 兼容 API

### 重要提示

- 确保使用的模型**支持视觉识别**（Vision）功能
- Base URL 必须指向兼容 OpenAI API 格式的端点
- API Key 格式根据服务商而定（不一定是 `sk-` 开头）

## 注意事项

- 所有业务数据存储在 IndexedDB，不会上传到服务器
- AI API Key 仅用于调用 AI 服务，不会存储在服务器端
- 图片会压缩为缩略图（200px 宽度，质量 0.5）存储，节省空间
- 上传到 AI 的图片会进一步压缩（最大 1MB，1024px），提升响应速度
- 建议定期备份数据（可通过浏览器开发者工具导出 IndexedDB）
- AI 分析过程中可以随时取消，避免浪费 API 调用
- 支持的模型必须支持视觉识别（Vision）功能
- 应用使用内存缓存机制（5分钟 TTL）提升性能，数据更新会自动失效缓存
- 手动 BMR 模式适合有专业测试数据（如体脂秤、专业设备）的用户

## 开发规范

- 使用 TypeScript 严格模式
- 所有组件使用 'use client' 指令（客户端组件）
- API 路由使用 Edge Runtime，支持流式响应
- 遵循移动端优先的设计原则
- 所有交互必须包含动画反馈（Framer Motion）
- 使用 Context API 管理全局状态（如分析状态）
- 图片处理统一压缩为缩略图，节省存储空间
- 使用内存缓存机制提升数据加载性能（5分钟 TTL）
- 错误处理要友好，给用户明确的提示信息
- 数据持久化使用 IndexedDB，支持离线使用
- 营养成分数据自动聚合到每日汇总，支持向后兼容

## 数据流说明

1. **AI 分析流程**：
   - 用户拍摄/选择照片 → CameraButton 组件
   - 调用 `/api/analyze` API（流式响应）
   - 实时解析流式数据 → `utils/stream.ts`
   - 更新 AnalysisContext 状态
   - 保存到 IndexedDB → `services/food.ts`
   - 自动刷新仪表盘数据

2. **数据存储流程**：
   - 用户设置 → `USER_SETTINGS` key
   - 每日汇总 → `daily_YYYY-MM-DD` key（包含总热量和总营养成分）
   - 食物记录 → `food_record_${timestamp}_${uuid}` key（包含每道菜的详细信息）

3. **状态管理**：
   - 全局分析状态通过 `AnalysisContext` 管理
   - 各页面通过 `useAnalysis` hook 访问和更新状态
   - 通知组件自动响应状态变化
   - 内存缓存机制自动管理数据缓存，提升性能

4. **营养成分追踪流程**：
   - AI 分析返回每道菜的营养成分（蛋白质、碳水化合物、脂肪）
   - 自动聚合到食物记录和每日汇总
   - 首页实时显示当日总营养成分
   - 详情页显示每餐和每道菜的详细营养成分
   - 删除记录时自动更新营养成分汇总


