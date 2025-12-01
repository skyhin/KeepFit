'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveUserProfile, getSettings, updateAIConfig, updateBMRSettings } from '@/services/settings';
import type { UserSettings } from '@/types';
import { useAnalysis } from '@/contexts/AnalysisContext';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { analysisStatus, notificationHeight } = useAnalysis();
  const router = useRouter();

  // 表单状态
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetDeficit, setTargetDeficit] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o');
  const [useManualBMR, setUseManualBMR] = useState(false);
  
  // 保存初始状态，用于检测是否有更改
  const [initialState, setInitialState] = useState<{
    gender: 'male' | 'female';
    age: string;
    height: string;
    weight: string;
    targetDeficit: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    useManualBMR: boolean;
  } | null>(null);
  
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getSettings();
      if (data) {
        setSettings(data);
        const loadedGender = data.profile.gender;
        const loadedAge = data.profile.age.toString();
        const loadedHeight = data.profile.height.toString();
        const loadedWeight = data.profile.weight.toString();
        const loadedTargetDeficit = data.goals.targetDeficit.toString();
        const loadedApiKey = data.aiConfig.apiKey;
        const loadedBaseUrl = data.aiConfig.baseUrl;
        const loadedModel = data.aiConfig.model;
        const loadedUseManualBMR = data.bmrSettings?.useManualBMR ?? false;
        
        setGender(loadedGender);
        setAge(loadedAge);
        setHeight(loadedHeight);
        setWeight(loadedWeight);
        setTargetDeficit(loadedTargetDeficit);
        setApiKey(loadedApiKey);
        setBaseUrl(loadedBaseUrl);
        setModel(loadedModel);
        setUseManualBMR(loadedUseManualBMR);
        
        // 保存初始状态
        setInitialState({
          gender: loadedGender,
          age: loadedAge,
          height: loadedHeight,
          weight: loadedWeight,
          targetDeficit: loadedTargetDeficit,
          apiKey: loadedApiKey,
          baseUrl: loadedBaseUrl,
          model: loadedModel,
          useManualBMR: loadedUseManualBMR,
        });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const ageNum = parseInt(age);
      const heightNum = parseInt(height);
      const weightNum = parseFloat(weight);
      const targetNum = parseInt(targetDeficit);

      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        alert('请输入有效的年龄');
        setIsSaving(false);
        return;
      }
      if (isNaN(heightNum) || heightNum < 50 || heightNum > 250) {
        alert('请输入有效的身高 (50-250 cm)');
        setIsSaving(false);
        return;
      }
      if (isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
        alert('请输入有效的体重 (20-300 kg)');
        setIsSaving(false);
        return;
      }
      if (isNaN(targetNum) || targetNum < 0) {
        alert('请输入有效的目标赤字 (≥ 0)');
        setIsSaving(false);
        return;
      }

      await saveUserProfile(
        {
          gender,
          age: ageNum,
          height: heightNum,
          weight: weightNum,
        },
        targetNum
      );

      // 更新 AI 配置
      if (apiKey) {
        await updateAIConfig({
          apiKey,
          baseUrl,
          model,
        });
      }

      // 更新 BMR 设置（只更新开关状态，不更新BMR值）
      await updateBMRSettings(useManualBMR);

      await loadSettings();
      // loadSettings 会自动更新初始状态，所以这里不需要手动更新
      
      // 保存成功后返回上一页
      router.back();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
      setIsSaving(false);
    }
  };

  // 检测是否有未保存的更改
  const hasUnsavedChanges = (): boolean => {
    if (!initialState) return false;
    
    return (
      initialState.gender !== gender ||
      initialState.age !== age ||
      initialState.height !== height ||
      initialState.weight !== weight ||
      initialState.targetDeficit !== targetDeficit ||
      initialState.apiKey !== apiKey ||
      initialState.baseUrl !== baseUrl ||
      initialState.model !== model ||
      initialState.useManualBMR !== useManualBMR
    );
  };

  // 处理返回操作
  const handleBack = (e: React.MouseEvent) => {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      setShowSaveConfirm(true);
    } else {
      router.push('/');
    }
  };

  // 确认保存并返回
  const handleSaveAndBack = async () => {
    setShowSaveConfirm(false);
    try {
      setIsSaving(true);
      const ageNum = parseInt(age);
      const heightNum = parseInt(height);
      const weightNum = parseFloat(weight);
      const targetNum = parseInt(targetDeficit);

      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        alert('请输入有效的年龄');
        setIsSaving(false);
        return;
      }
      if (isNaN(heightNum) || heightNum < 50 || heightNum > 250) {
        alert('请输入有效的身高 (50-250 cm)');
        setIsSaving(false);
        return;
      }
      if (isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
        alert('请输入有效的体重 (20-300 kg)');
        setIsSaving(false);
        return;
      }
      if (isNaN(targetNum) || targetNum < 0) {
        alert('请输入有效的目标赤字 (≥ 0)');
        setIsSaving(false);
        return;
      }

      await saveUserProfile(
        {
          gender,
          age: ageNum,
          height: heightNum,
          weight: weightNum,
        },
        targetNum
      );

      // 更新 AI 配置
      if (apiKey) {
        await updateAIConfig({
          apiKey,
          baseUrl,
          model,
        });
      }

      // 更新 BMR 设置（只更新开关状态，不更新BMR值）
      await updateBMRSettings(useManualBMR);

      await loadSettings();
      router.push('/');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
      setIsSaving(false);
    }
  };

  // 确认不保存并返回
  const handleDiscardAndBack = () => {
    setShowSaveConfirm(false);
    router.push('/');
  };

  // 取消返回
  const handleCancelBack = () => {
    setShowSaveConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 p-4 pt-12">
        <motion.button
          className="p-2 rounded-xl bg-card"
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <h1 className="text-2xl font-bold">设置</h1>
      </div>
      
      {/* 保存确认对话框 */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-card rounded-2xl p-6 max-w-sm w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3 className="text-lg font-semibold mb-2">未保存的更改</h3>
            <p className="text-sm text-gray-400 mb-6">
              您有未保存的设置更改，确定要离开吗？
            </p>
            <div className="flex gap-3">
              <motion.button
                className="flex-1 py-2.5 rounded-lg bg-gray-700 text-white font-semibold"
                onClick={handleCancelBack}
                whileTap={{ scale: 0.95 }}
              >
                取消
              </motion.button>
              <motion.button
                className="flex-1 py-2.5 rounded-lg bg-gray-700 text-white font-semibold"
                onClick={handleDiscardAndBack}
                whileTap={{ scale: 0.95 }}
              >
                不保存
              </motion.button>
              <motion.button
                className="flex-1 py-2.5 rounded-lg bg-success text-black font-semibold"
                onClick={handleSaveAndBack}
                whileTap={{ scale: 0.95 }}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      <div 
        className="px-4 space-y-6 pb-24"
        style={{ 
          marginTop: analysisStatus !== null && notificationHeight > 0 ? `${notificationHeight + 16}px` : '24px' 
        }}
      >
        {/* 身体档案 */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold mb-4">身体档案</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">性别</label>
              <div className="flex gap-2">
                <motion.button
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    gender === 'male'
                      ? 'bg-white text-black'
                      : 'bg-card text-gray-400'
                  }`}
                  onClick={() => setGender('male')}
                  whileTap={{ scale: 0.95 }}
                >
                  男性
                </motion.button>
                <motion.button
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    gender === 'female'
                      ? 'bg-white text-black'
                      : 'bg-card text-gray-400'
                  }`}
                  onClick={() => setGender('female')}
                  whileTap={{ scale: 0.95 }}
                >
                  女性
                </motion.button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">年龄</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="请输入年龄"
                className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">身高 (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="请输入身高"
                className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">体重 (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="请输入体重"
                className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
              />
            </div>
          </div>
        </motion.div>

        {/* 基础代谢设置 */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-4">基础代谢设置</h2>
          <div className="space-y-4">
            {/* 开关：手动输入BMR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium">基础代谢计算更改为手动输入</div>
                <motion.button
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                    useManualBMR ? 'bg-success' : 'bg-gray-600'
                  }`}
                  onClick={() => setUseManualBMR(!useManualBMR)}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                    animate={{
                      x: useManualBMR ? 28 : 4,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      left: 0,
                    }}
                  />
                </motion.button>
              </div>
              <div className="text-xs text-gray-500">
                开启后，可在首页手动输入每天的基础代谢值，不再根据身高、体重、性别自动计算
              </div>
            </div>

            {/* 计算公式提示（仅在开关关闭时显示） */}
            {!useManualBMR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-card/50 border border-gray-700"
              >
                <div className="text-xs text-gray-400 mb-2">基础代谢计算公式（Mifflin-St Jeor 公式）：</div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>• 男性：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄(岁) + 5</div>
                  <div>• 女性：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄(岁) - 161</div>
                </div>
              </motion.div>
            )}
            
            {/* 提示信息（开关打开时显示） */}
            {useManualBMR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-card/50 border border-gray-700"
              >
                <div className="text-xs text-gray-400">
                  开启后，可在首页手动输入每天的基础代谢值。每天的基础代谢值可能不同，在当天的记录中输入即可。
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* 目标设定 */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold mb-4">目标设定</h2>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">目标赤字 (kcal/天)</label>
            <input
              type="number"
              value={targetDeficit}
              onChange={(e) => setTargetDeficit(e.target.value)}
              placeholder="如：500"
              className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
            />
            <div className="text-xs text-gray-500 mt-2">
              建议：每天消耗比摄入多 300-500 kcal 可健康减重
            </div>
          </div>
        </motion.div>

        {/* AI 配置 */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-lg font-semibold mb-2">AI 配置 (BYOK - 自带密钥)</h2>
          <p className="text-xs text-gray-500 mb-4">
            支持任意兼容 OpenAI API 格式的服务商，包括 OpenAI、通义千问、Claude 等
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">API Key *</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxx 或你的 API Key"
                className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
              />
              <div className="text-xs text-gray-500 mt-1">
                从你的 AI 服务商获取 API Key
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
              />
              <div className="text-xs text-gray-500 mt-1">
                <div className="mb-1">⚠️ 重要：Base URL 必须以 <code className="text-gray-400">/v1</code> 结尾</div>
                示例：
                <br />• OpenAI: <code className="text-gray-400">https://api.openai.com/v1</code>
                <br />• 通义千问: <code className="text-gray-400">https://dashscope.aliyuncs.com/compatible-mode/v1</code>
                <br />• 自定义代理: <code className="text-gray-400">https://your-proxy.com/v1</code>
                <br />
                <div className="mt-1 text-warning">
                  如果遇到 404 错误，请检查 Base URL 格式是否正确
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">模型名称 *</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
                className="w-full px-4 py-3 rounded-lg bg-background text-white border border-gray-700"
              />
              <div className="text-xs text-gray-400 mt-1">
                示例：
                <br />• OpenAI: <code className="text-gray-300">gpt-4o</code>, <code className="text-gray-300">gpt-4-vision-preview</code>, <code className="text-gray-300">gpt-4o-mini</code>
                <br />• 通义千问: <code className="text-gray-300">qwen-vl-max</code>, <code className="text-gray-300">qwen-vl-plus</code>
                <br />
                <div className="mt-1 text-warning">
                  ⚠️ 必须使用支持视觉识别（Vision）的模型，否则会报 404 错误
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 保存按钮 */}
        <motion.button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleSave}
          disabled={isSaving}
          whileTap={{ scale: 0.95 }}
        >
          <Save className="w-5 h-5" />
          {isSaving ? '保存中...' : '保存设置'}
        </motion.button>

        {/* 显示当前 BMR（如果已设置） */}
        {settings && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-sm text-gray-400 mb-2">当前基础代谢率 (BMR)</div>
            <div className="text-3xl font-bold">
              {settings.computed.bmr} <span className="text-lg text-gray-400">kcal/天</span>
            </div>
            {settings.bmrSettings?.useManualBMR && (
              <div className="text-xs text-gray-500 mt-2">
                当前为手动输入模式
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}


