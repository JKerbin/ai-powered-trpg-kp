"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import styles from "./create.module.scss";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");

  const [saveName, setSaveName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useGSAP(() => {
    gsap.fromTo(".create-container", {
      opacity: 0,
      y: 20,
    }, {
      opacity: 1,
      y: 0,
      duration: 0.8,
    });
  }, []);

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型是否为PDF
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("请上传PDF格式的文件");
        setSelectedFile(null);
      }
    }
  };

  // 处理表单提交
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userId) {
      setError("用户信息丢失，请重新开始");
      return;
    }

    if (!saveName.trim()) {
      setError("请输入存档名称");
      return;
    }

    if (!selectedFile) {
      setError("请选择PDF文件");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", userId);
      formData.append("saveName", saveName);

      // 发送请求到API
      const response = await fetch("/api/create", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "创建存档失败");
      }

      // 显示成功信息并重置表单
      setSuccess(true);
      setSaveName("");
      setSelectedFile(null);
      
      // 3秒后返回存档列表页面
      setTimeout(() => {
        router.push(`/saveList?userId=${userId}`);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建存档时发生错误");
      console.error("创建存档失败:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // 返回上一页
  const handleBack = () => {
    router.back();
  };

  // 检查是否有userId
  if (!userId) {
    return (
      <div className="create-container">
        <div className="error-message">未找到用户信息，请重新开始</div>
        <button onClick={handleBack} className="back-button">返回</button>
      </div>
    );
  }

  return (
    <div className="create-container">
      <div className="create-content">
        <div className="corner corner-top-left"></div>
        <div className="corner corner-top-right"></div>
        <div className="corner corner-bottom-left"></div>
        <div className="corner corner-bottom-right"></div>

        <div className="title">
          <div className="title-text">创建新存档</div>
          <button onClick={handleBack} className="back-button">
            返回
          </button>
        </div>

        {success ? (
          <div className="success-message">
            存档创建成功！3秒后自动返回存档列表...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="create-form">
            <div className="form-group">
              <label htmlFor="saveName">存档名称</label>
              <input
                type="text"
                id="saveName"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="请输入存档名称"
                disabled={isUploading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pdfFile">上传PDF文件</label>
              <div className="file-upload">
                <input
                  type="file"
                  id="pdfFile"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="file-input"
                />
                <label htmlFor="pdfFile" className="file-label">
                  {selectedFile ? selectedFile.name : "点击选择PDF文件"}
                </label>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isUploading}
              >
                {isUploading ? "上传中..." : "创建存档"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}