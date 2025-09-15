'use server';

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

// 定义响应类型
export interface ActionResponse {
  success: boolean;
  response?: string;
  error?: string;
}

// React Action函数 - 在服务器端执行
export async function generateChatResponse(message: string): Promise<ActionResponse> {
  try {
    // 这里可以添加实际的大模型调用逻辑
    // 目前仍然使用乱数假文，但在未来可以替换为真实的AI模型调用
    const botResponse = generateRandomText();
    
    return {
      success: true,
      response: botResponse
    };
  } catch (error) {
    console.error('Error generating chat response:', error);
    return {
      success: false,
      error: 'Failed to generate response'
    };
  }
}