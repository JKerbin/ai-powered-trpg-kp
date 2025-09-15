"use client"
import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import { generateChatResponse } from './action';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理发送消息 - 使用React Action调用服务器端函数
  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 调用React Action获取回答（在服务器端执行）
      const result = await generateChatResponse(input);

      if (result.success && result.response) {
        // 添加机器人回复
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.response,
          sender: 'bot'
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // 添加错误消息
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.error || '抱歉，我暂时无法回复你的消息。请稍后再试。',
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
    } finally {
      setIsLoading(false);
    }
  };

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
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
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage} ${styles.loadingMessage}`}>
            <div className={styles.messageContent}>
              <div className={styles.loadingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.chatbotFooter}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={isLoading}
          className={styles.input}
        />
        <button onClick={handleSend} className={styles.sendButton}>
          发送
        </button>
      </div>
    </div>
  );
}
