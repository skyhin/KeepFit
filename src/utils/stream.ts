/**
 * 解析 Vercel AI SDK 的流式响应
 * 从 SSE (Server-Sent Events) 格式中提取 JSON 数据
 */
export async function parseStreamResponse(
  response: Response
): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
  }

  // 解析 SSE 格式
  // SSE 格式: data: {...}\n\n
  const dataLines = fullText
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s*/, '').trim())
    .filter((line) => line && line !== '[DONE]');

  // 合并所有数据块（处理增量更新）
  let jsonText = '';
  for (const line of dataLines) {
    try {
      const parsed = JSON.parse(line);
      // Vercel AI SDK 的流式格式
      if (parsed.type === 'text-delta' && parsed.textDelta) {
        jsonText += parsed.textDelta;
      } else if (parsed.type === 'text-chunk' && parsed.textChunk) {
        jsonText += parsed.textChunk;
      } else if (parsed.type === 'finish') {
        break;
      } else if (parsed.type === 'text' && parsed.text) {
        jsonText = parsed.text;
        break;
      } else if (parsed.content) {
        // 某些格式可能直接包含 content
        jsonText += parsed.content;
      }
    } catch {
      // 如果解析失败，可能是完整的 JSON 字符串或纯文本
      if (line.trim() && !line.startsWith('{') && !line.startsWith('[')) {
        // 可能是纯文本内容，直接使用
        jsonText += line;
      } else {
        // 可能是 JSON，尝试使用
        jsonText = line;
      }
    }
  }

  // 如果还没有提取到内容，尝试从原始文本中提取 JSON
  if (!jsonText) {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
  }

  // 清理可能的 markdown 代码块标记
  if (jsonText) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  return jsonText;
}


