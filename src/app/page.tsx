"use client"
import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
}

// 定义API响应类型
interface ApiResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '你好！我是一个简单的聊天机器人。无论你说什么，我都会回复乱数假文。',
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理发送消息 - 现在调用API而不是在客户端生成回答
  const handleSend = async () => {
    if (input.trim() === '') return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // 调用服务器端API获取回答
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input })
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.response) {
        // 添加机器人回复
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'bot'
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // 添加错误消息
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: '抱歉，我暂时无法回复你的消息。请稍后再试。',
          sender: 'bot'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '网络错误，请检查你的连接后重试。',
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatbotContainer}>
      <div className={styles.chatbotHeader}>
        <h1>简单聊天机器人</h1>
      </div>
      <div className={styles.chatbotBody}>
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.botMessage}`}
          >
            <div className={styles.messageContent}>
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.chatbotFooter}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          className={styles.input}
        />
        <button onClick={handleSend} className={styles.sendButton}>
          发送
        </button>
      </div>
    </div>
  );
}
