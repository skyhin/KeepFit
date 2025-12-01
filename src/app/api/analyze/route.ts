import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// 使用 Node.js runtime 以确保更好的兼容性
export const maxDuration = 300; // 5 分钟

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取配置（完全按照用户设置，不做任何处理）
    const apiKey = request.headers.get('x-api-key');
    const baseUrl = request.headers.get('x-base-url');
    const model = request.headers.get('x-model');

    console.log('[API] 收到请求');
    console.log('[API] 配置:', { 
      hasApiKey: !!apiKey, 
      baseUrl, 
      model 
    });

    if (!apiKey) {
      return new Response(JSON.stringify({ error: '缺少 API Key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!baseUrl) {
      return new Response(JSON.stringify({ error: '缺少 Base URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!model) {
      return new Response(JSON.stringify({ error: '缺少模型名称' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return new Response(JSON.stringify({ error: '缺少图片数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 系统提示词
    const systemPrompt = `你是一位专业的营养师。请详细分析图片中的所有食物（可能包含多道菜，如米饭、牛肉、蔬菜等）。

对于图片中的每一道菜，请提供以下信息：
1. 食物名称（中文）
2. 估算重量（如 "150g"）
3. 热量（kcal）
4. 三大营养素：蛋白质、碳水化合物、脂肪（单位：克）

请以 JSON 格式返回，格式如下：
{
  "foods": [
    {
      "name": "米饭",
      "estimatedWeight": "200g",
      "calories": 260,
      "macros": {
        "protein": 5,
        "carbs": 58,
        "fat": 0.5
      },
      "tips": "建议选择糙米更健康"
    },
    {
      "name": "红烧牛肉",
      "estimatedWeight": "150g",
      "calories": 320,
      "macros": {
        "protein": 25,
        "carbs": 8,
        "fat": 20
      }
    }
  ],
  "tips": "整体建议：这餐蛋白质充足，但脂肪略高"
}

重要：
1. foods 是一个数组，包含图片中识别出的所有食物
2. 请仔细识别图片中的每一道菜，不要遗漏
3. 只返回 JSON 对象，不要包含任何其他文字说明`;

    // 直接使用 OpenAI SDK（避免 Vercel AI SDK 的端点问题）
    const openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });

    console.log('[API] 配置:', { model, baseUrl, hasApiKey: !!apiKey });

    // 调用视觉模型（使用标准的 OpenAI API 格式）
    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
              },
            },
            {
              type: 'text',
              text: '请分析这张图片中的食物，并以 JSON 格式返回结果。',
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
      stream: true,
    });

    // 转换为 SSE 流式响应
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = `data: ${JSON.stringify({ type: 'text-delta', textDelta: content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API] 错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return new Response(
      JSON.stringify({
        error: '分析失败',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
