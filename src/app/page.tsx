"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import "./page.scss";

export default function HomePage() {
  const faceContainerRef = useRef<HTMLDivElement>(null);
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const firstShapeRef = useRef<HTMLDivElement>(null);
  const secondShapeRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);
  const invitationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState('');

  useGSAP(() => {
    // 创建时间轴
    const tl = gsap.timeline();
    tl.set(invitationRef.current, { opacity: 0 })
      .to(
        faceContainerRef.current,
        {
          width: "14vw",
          height: "14vw",
          duration: 1,
          ease: "power2.inOut",
        },
        0
      )
      .to(
        firstShapeRef.current,
        {
          width: "17vw",
          height: "17vw",
          duration: 1,
          ease: "power2.inOut",
        },
        0.4
      )
      .to(
        secondShapeRef.current,
        {
          width: "20vw",
          height: "20vw",
          duration: 1,
          ease: "power2.inOut",
        },
        0.4
      )
      .to(logoContainerRef.current, {
        rotation: 45,
        duration: 0.8,
        ease: "power2.inOut",
      })
      .to(eyesRef.current, {
        width: "6vw",
        duration: 0.4,
        ease: "power2.inOut",
      })
      .to(logoContainerRef.current, {
        y: "-35%",
        duration: 0.8,
        ease: "power2.inOut",
      })
      .to(
        invitationRef.current,
        {
          opacity: 1,
          width: "30vw",
          duration: 0.8,
          ease: "power2.inOut",
        },
        2.6
      )
      .to(logoContainerRef.current, {
        y: "-30%",
        duration: 1.2,
        ease: "power2.inOut",
        repeat: -1,
        yoyo: true,
      });
  }, []);

  // 有效的测试邀请码列表
  const validTesterIds = [
    "20c904c2-f129-42e2-a832-1a7d7933f65d",
    "c59f304c-1cac-40e7-9fa2-7a7640c9410f",
    "e295ee73-7d1a-426d-8360-766f7a52469e"
  ];

  const handleNavigateToChat = () => {
    // 验证邀请码是否在有效列表中
    if (validTesterIds.includes(invitationCode)) {
      // 验证通过，跳转到存档列表页面，并携带用户ID
      router.push(`/saveList?userId=${invitationCode}`);
    } else {
      // 验证失败，清空输入框
      setInvitationCode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <>
      <div className="home-container">
        <div ref={logoContainerRef} className="logo-container">
          <div ref={firstShapeRef} className="deco-shape">
            TABLETOP RPG
          </div>
          <div ref={secondShapeRef} className="deco-shape">
            AIKP ROBOT
            <div className="arrow">
              <div className="top-part"></div>
              <div className="bottom-part"></div>
            </div>
          </div>
          <div ref={faceContainerRef} className="robot-face">
            <div ref={eyesRef} className="eyes"></div>
          </div>
        </div>
        <div ref={invitationRef} className="invitation">
          <div className="corner corner-top-left"></div>
          <div className="corner corner-top-right"></div>
          <div className="corner corner-bottom-left"></div>
          <div className="corner corner-bottom-right"></div>

          <input
            ref={inputRef}
            className="invitation-input"
            type="text"
            placeholder="输入测试邀请码"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNavigateToChat();
              }
            }}
          />
          <button className="invitation-button" onClick={handleNavigateToChat}>
            <img src="/enter.svg" alt="enter" />
          </button>
        </div>
      </div>
    </>
  );
}
