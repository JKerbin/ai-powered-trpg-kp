// 服务器端API路由，用于生成乱数假文
import { NextResponse } from 'next/server';

// 生成乱数假文的函数
const generateRandomText = (): string => {
  const words = [
    "Lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
    "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
    "magna", "aliqua", "Ut", "enim", "ad", "minim", "veniam", "quis", "nostrud",
    "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea",
    "commodo", "consequat", "Duis", "aute", "irure", "dolor", "in", "reprehenderit",
    "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla",
    "pariatur", "Excepteur", "sint", "occaecat", "cupidatat", "non", "proident",
    "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"
  ];
  
  const sentenceCount = Math.floor(Math.random() * 3) + 2; // 2-4个句子
  let result = '';
  
  for (let i = 0; i < sentenceCount; i++) {
    const wordCount = Math.floor(Math.random() * 8) + 5; // 5-12个单词
    const sentenceWords = [];
    
    for (let j = 0; j < wordCount; j++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      sentenceWords.push(words[randomIndex]);
    }
    
    // 首字母大写，添加句号
    const sentence = sentenceWords.join(' ').charAt(0).toUpperCase() + 
                    sentenceWords.join(' ').slice(1) + '. ';
    result += sentence;
  }
  
  return result.trim();
};

// 处理POST请求
export async function POST(request: Request) {
  try {
    // 从请求体中获取用户消息（虽然在这个简单实现中我们不使用它）
    const { message } = await request.json();
    
    // 生成乱数假文
    const botResponse = generateRandomText();
    
    // 返回响应
    return NextResponse.json({
      success: true,
      response: botResponse
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}