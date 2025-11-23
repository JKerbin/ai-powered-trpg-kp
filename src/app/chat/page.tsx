"use client";
import { useState, useRef, useEffect } from "react";
import styles from "./page.module.scss";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  isStreaming?: boolean;
}

// 定义流式响应数据类型
interface StreamData {
  success: boolean;
  response?: string;
  finished?: boolean;
  error?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "你好！我是一个简单的聊天机器人。无论你说什么，我都会回复乱数假文。",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理发送消息 - 使用流式API调用
  const handleSend = async () => {
    if (input.trim() === "" || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // 生成机器人回复的初始消息ID
    const botMessageId = (Date.now() + 1).toString();

    // 创建一个初始的流式机器人消息
    const initialBotMessage: Message = {
      id: botMessageId,
      content: "",
      sender: "bot",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, initialBotMessage]);

    try {
      // 调用流式API获取回答
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      const decoder = new TextDecoder();
      let partialLine = "";

      // 处理流式响应
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码接收到的数据
        const chunk = decoder.decode(value, { stream: true });
        // 合并之前可能不完整的行
        const lines = (partialLine + chunk).split("\n");
        // 保存最后一行（可能不完整）
        partialLine = lines.pop() || "";

        // 处理每一行数据
        for (const line of lines) {
          // 跳过空行
          if (line.trim() === "") continue;

          // 检查是否是数据行
          if (line.startsWith("data:")) {
            const dataStr = line.substring(5).trim();

            // 检查是否结束标记
            if (dataStr === "[DONE]") {
              // 更新消息状态为非流式
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
                )
              );
              continue;
            }

            try {
              // 解析JSON数据
              const data: StreamData = JSON.parse(dataStr);

              if (data.success && data.response) {
                // 更新机器人消息内容
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? {
                          ...msg,
                          content: data.response || "", // 确保 content 不为 undefined
                          isStreaming: !data.finished,
                        }
                      : msg
                  )
                );
              } else if (data.error) {
                // 更新为错误消息
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? {
                          ...msg,
                          content: data.error || "未知错误",
                          isStreaming: false,
                        }
                      : msg
                  )
                );
              }
            } catch (jsonError) {
              console.error("Error parsing stream data:", jsonError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in streaming request:", error);
      // 更新为错误消息
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: "网络错误，请检查你的连接后重试。",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatContent}>
        <div className={styles.corner + ' ' + styles.cornerTopLeft}></div>
        <div className={styles.corner + ' ' + styles.cornerTopRight}></div>
        <div className={styles.corner + ' ' + styles.cornerBottomLeft}></div>
        <div className={styles.corner + ' ' + styles.cornerBottomRight}></div>

        <div className={styles.chatHeader}>
          <div className={styles.titleText}>继续冒险</div>
          <div 
            className={styles.backButton}
            onClick={() => {
              const searchParams = new URLSearchParams(window.location.search);
              const userId = searchParams.get('userId');
              if (userId) {
                window.location.href = `/saveList?userId=${userId}`;
              }
            }}
          >
            <div className={styles.decoShape}></div>
            <div className={styles.backButtonText}>返回存档列表</div>
          </div>
        </div>

        <div className={styles.chatBody}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.sender === "user" ? styles.userMessage : styles.botMessage
              } ${message.isStreaming ? styles.streamingMessage : ""}`}
            >
              <div className={styles.messageContent}>
                {message.content}
                {message.isStreaming && (
                  <span className={styles.streamingIndicator}>
                    <span className={styles.loadingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.chatFooter}>
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
            <img src="/send.svg" alt="发送" />
          </button>
        </div>
      </div>
    </div>
  );
}