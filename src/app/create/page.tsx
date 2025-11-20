"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "./page.scss";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");

  const [saveName, setSaveName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 角色信息状态
  const [characterInfo, setCharacterInfo] = useState({
    NAME: "",
    STR: 60,
    CON: 45,
    SIZ: 60,
    INT: 65,
    POW: 70,
    DEX: 50,
    APP: 75,
    EDU: 65,
    SAN: 30,
    HP: 12,
    WEAPON: "",
    SKILLS: [] as string[],
    DESCRIPTION: "",
  });

  // 可选技能列表
  const availableSkills = [
    "克苏鲁神话",
    "议价",
    "躲闪",
    "快速交谈",
    "聆听",
    "侦查",
    "心理学",
    "医学",
    "神秘学",
    "说服",
    "潜行",
    "射击",
    "格斗",
    "恐吓",
    "知识",
    "语言",
  ];

  // 更新角色信息
  const updateCharacterInfo = (field: string, value: any) => {
    setCharacterInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理技能选择
  const handleSkillChange = (skill: string, isSelected: boolean) => {
    if (isSelected) {
      setCharacterInfo((prev) => ({
        ...prev,
        SKILLS: [...prev.SKILLS, skill],
      }));
    } else {
      setCharacterInfo((prev) => ({
        ...prev,
        SKILLS: prev.SKILLS.filter((s) => s !== skill),
      }));
    }
  };

  useGSAP(() => {
    const tl = gsap.timeline({
      defaults: {
        duration: 0.5,
      },
    });
    tl.fromTo(
      ".create-content",
      {
        opacity: 0,
        height: "10vh",
      },
      {
        opacity: 1,
        height: "90vh",
      }
    ).fromTo(
      ".create-form",
      {
        opacity: 0,
      },
      {
        opacity: 1,
      }
    );
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

    if (!characterInfo.NAME.trim()) {
      setError("请输入角色名称");
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

      // 添加角色信息到FormData
      formData.append("characterInfo", JSON.stringify(characterInfo));

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

      // 3秒后进入下一步
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
        <button onClick={handleBack} className="back-button">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="create-container">
      <div className="create-content">
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
            <div className="basic-section">
              <h3>基本信息</h3>
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
                <label htmlFor="pdfFile">上传TRPG模组设定集</label>
                <div className="file-upload">
                  <input
                    type="file"
                    id="pdfFile"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="file-input"
                  />
                  <div className="file-label">
                    {selectedFile ? selectedFile.name : "点击选择PDF文件"}
                  </div>
                </div>
              </div>
            </div>

            <div className="character-section">
              <h3>角色信息</h3>

              {/* 文本类输入 */}
              <div className="form-group">
                <label htmlFor="characterName">角色名称 (NAME)</label>
                <input
                  type="text"
                  id="characterName"
                  value={characterInfo.NAME}
                  onChange={(e) => updateCharacterInfo("NAME", e.target.value)}
                  placeholder="请输入角色名称"
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="weapon">武器 (WEAPON)</label>
                <input
                  type="text"
                  id="weapon"
                  value={characterInfo.WEAPON}
                  onChange={(e) =>
                    updateCharacterInfo("WEAPON", e.target.value)
                  }
                  placeholder="请输入武器名称"
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">角色描述 (DESCRIPTION)</label>
                <textarea
                  id="description"
                  value={characterInfo.DESCRIPTION}
                  onChange={(e) =>
                    updateCharacterInfo("DESCRIPTION", e.target.value)
                  }
                  placeholder="请输入角色描述"
                  rows={3}
                  disabled={isUploading}
                />
              </div>

              {/* 数值类滑条 */}
              <div className="stats-container">
                <div className="stat-item">
                  <label>力量 (STR): {characterInfo.STR}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.STR}
                    onChange={(e) =>
                      updateCharacterInfo("STR", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>体质 (CON): {characterInfo.CON}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.CON}
                    onChange={(e) =>
                      updateCharacterInfo("CON", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>体型 (SIZ): {characterInfo.SIZ}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.SIZ}
                    onChange={(e) =>
                      updateCharacterInfo("SIZ", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>智力 (INT): {characterInfo.INT}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.INT}
                    onChange={(e) =>
                      updateCharacterInfo("INT", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>意志 (POW): {characterInfo.POW}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.POW}
                    onChange={(e) =>
                      updateCharacterInfo("POW", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>敏捷 (DEX): {characterInfo.DEX}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.DEX}
                    onChange={(e) =>
                      updateCharacterInfo("DEX", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>外貌 (APP): {characterInfo.APP}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.APP}
                    onChange={(e) =>
                      updateCharacterInfo("APP", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>教育 (EDU): {characterInfo.EDU}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={characterInfo.EDU}
                    onChange={(e) =>
                      updateCharacterInfo("EDU", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>理智 (SAN): {characterInfo.SAN}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={characterInfo.SAN}
                    onChange={(e) =>
                      updateCharacterInfo("SAN", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="stat-item">
                  <label>生命值 (HP): {characterInfo.HP}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={characterInfo.HP}
                    onChange={(e) =>
                      updateCharacterInfo("HP", parseInt(e.target.value))
                    }
                    disabled={isUploading}
                  />
                </div>
              </div>

              {/* 技能多选 */}
              <div className="form-group">
                <label>技能选择 (SKILLS) - 可多选</label>
                <div className="skills-container">
                  {availableSkills.map((skill) => (
                    <label key={skill} className="skill-checkbox">
                      <input
                        type="checkbox"
                        checked={characterInfo.SKILLS.includes(skill)}
                        onChange={(e) =>
                          handleSkillChange(skill, e.target.checked)
                        }
                        disabled={isUploading}
                      />
                      {skill}
                    </label>
                  ))}
                </div>
                <div className="selected-skills">
                  已选择:{" "}
                  {characterInfo.SKILLS.length > 0
                    ? characterInfo.SKILLS.join(", ")
                    : "无"}
                </div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={isUploading}
            >
              {isUploading ? "上传中..." : "下一步"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
