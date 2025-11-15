"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

// 定义存档元数据接口
export interface SaveMeta {
  name: string;
  player: string;
  time: string;
  round: number;
}

// 定义存档项接口
export interface SaveItem {
  saveId: string;
  meta: SaveMeta;
}

// 定义存档数据接口
export interface SaveData {
  userId: string;
  saves: SaveItem[];
  total: number;
}

export default function ClientSaveList() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [saves, setSaves] = useState<SaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useGSAP(() => {
    gsap.fromTo(".saveList-content", {
      height: "10%",
      opacity: 0,
      stagger: 0.2,
      duration: 0.8,
    },{
      height: "90%",
      opacity: 1,
    });
  }, []);

  useEffect(() => {
    // 检查是否有userId参数
    if (!userId) {
      setError("未找到用户信息，请重新输入邀请码");
      setLoading(false);
      return;
    }

    // 从API获取用户存档数据
    const fetchSaves = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/saveList?userId=${userId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "获取存档失败");
        }

        const data: SaveData = await response.json();
        setSaves(data.saves);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取存档时发生错误");
        console.error("获取存档失败:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSaves();
  }, [userId]);

  return (
    <div className="saveList-container">
      <div className="saveList-content">
        <div className="corner corner-top-left"></div>
        <div className="corner corner-top-right"></div>
        <div className="corner corner-bottom-left"></div>
        <div className="corner corner-bottom-right"></div>

        <div className="title">
          <div className="title-text">存档列表</div>
          <div className="new-save-btn">
            <div className="decoshape"></div>
            <div className="new-save-btn-text">
              <span>新建存档</span>
            </div>
          </div>
        </div>

        <div className="save-list">
          {loading && <div className="loading-message">加载存档中...</div>}

          {error && <div className="error-message">{error}</div>}

          {!loading && !error && saves.length === 0 && (
            <div className="empty-message">暂无存档</div>
          )}

          {!loading && !error && saves.length > 0 && (
            <div className="save-items">
              {saves.map((save) => (
                <div key={save.saveId} className="save-item">
                  <div className="save-item-content">
                    <div className="save-name">{save.meta.name}</div>
                    <div className="save-info">
                      <span className="player">玩家: {save.meta.player}</span>
                      <span className="time">{save.meta.time}</span>
                      <span className="round">第{save.meta.round}轮</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
