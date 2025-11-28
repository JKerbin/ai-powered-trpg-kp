// 服务器端API路由，用于流式生成响应
import { NextRequest, NextResponse } from "next/server";
import ModuleTasks from "../../../agent/workflows/moduleTasks";
import path from "path";

// 定义API响应接口
interface ChatResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

// 处理POST请求，返回流式响应
export async function POST(request: NextRequest) {
  try {
    // 从请求URL中获取查询参数
    const userId = request.nextUrl.searchParams.get("userId");
    const saveId = request.nextUrl.searchParams.get("saveId");
    // 验证参数
    if (!userId || !saveId) {
      return NextResponse.json<ChatResponse>(
        {
          success: false,
          error: "Missing required parameters: userId and saveId",
        },
        { status: 400 }
      );
    }
    const saveDir = path.join(process.cwd(), "user", userId, saveId);
    const moduleTasks = await ModuleTasks.create(saveDir);

    // 从请求体中获取用户消息
    const { message } = await request.json();

    // 生成完整的响应文本
    const fullResponse = await moduleTasks.continueGame(message);

    // 创建一个ReadableStream用于流式传输
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 模拟逐个字符发送，模拟流式生成
        for (let i = 0; i < fullResponse.length; i++) {
          // 发送一个字符作为流式响应数据
          const chunk = `data: ${JSON.stringify({
            success: true,
            response: fullResponse.substring(0, i + 1),
            finished: i === fullResponse.length - 1,
          })}\n\n`;

          controller.enqueue(encoder.encode(chunk));

          // 随机延迟10-50ms，模拟真实的生成速度
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 40 + 10)
          );
        }

        // 发送结束信号
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },

      cancel() {
        console.log("Stream was cancelled");
      },
    });

    // 返回流式响应，设置Content-Type为text/event-stream
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in streaming API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate streaming response" },
      { status: 500 }
    );
  }
}
