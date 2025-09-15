// 服务器端API路由，用于流式生成响应
import { NextResponse } from "next/server";

// 生成乱数假文的函数
const generateRandomText = (): string => {
  const words = [
    "Lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "sed",
    "do",
    "eiusmod",
    "tempor",
    "incididunt",
    "ut",
    "labore",
    "et",
    "dolore",
    "magna",
    "aliqua",
    "Ut",
    "enim",
    "ad",
    "minim",
    "veniam",
    "quis",
    "nostrud",
    "exercitation",
    "ullamco",
    "laboris",
    "nisi",
    "ut",
    "aliquip",
    "ex",
    "ea",
    "commodo",
    "consequat",
    "Duis",
    "aute",
    "irure",
    "dolor",
    "in",
    "reprehenderit",
    "in",
    "voluptate",
    "velit",
    "esse",
    "cillum",
    "dolore",
    "eu",
    "fugiat",
    "nulla",
    "pariatur",
    "Excepteur",
    "sint",
    "occaecat",
    "cupidatat",
    "non",
    "proident",
    "sunt",
    "in",
    "culpa",
    "qui",
    "officia",
    "deserunt",
    "mollit",
    "anim",
    "id",
    "est",
    "laborum",
  ];

  const sentenceCount = Math.floor(Math.random() * 3) + 2; // 2-4个句子
  let result = "";

  for (let i = 0; i < sentenceCount; i++) {
    const wordCount = Math.floor(Math.random() * 8) + 5; // 5-12个单词
    const sentenceWords = [];

    for (let j = 0; j < wordCount; j++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      sentenceWords.push(words[randomIndex]);
    }

    // 首字母大写，添加句号
    const sentence =
      sentenceWords.join(" ").charAt(0).toUpperCase() +
      sentenceWords.join(" ").slice(1) +
      ". ";
    result += sentence;
  }

  return result.trim();
};

// 处理POST请求，返回流式响应
export async function POST(request: Request) {
  try {
    // 从请求体中获取用户消息
    const { message } = await request.json();

    // 生成完整的响应文本
    const fullResponse = generateRandomText();

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
