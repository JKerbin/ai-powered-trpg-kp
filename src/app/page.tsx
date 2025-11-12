"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import "./page.scss";

export default function HomePage() {
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const firstShapeRef = useRef<HTMLDivElement>(null);
  const secondShapeRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);
  const invitationRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useGSAP(() => {
    // 创建时间轴
    const tl = gsap.timeline();
    tl.set(invitationRef.current, { opacity: 0 })
      .to(firstShapeRef.current, {
        width: "17vw",
        height: "17vw",
        duration: 1.4,
        ease: "power2.inOut",
      })
      .to(
        secondShapeRef.current,
        {
          width: "20vw",
          height: "20vw",
          duration: 1.4,
          ease: "power2.inOut",
        },
        0
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
      .to(
        logoContainerRef.current,
        {
          y: "-30%",
          duration: 1.2,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        }
      );
  }, []);

  const handleNavigateToChat = () => {
    router.push("/saveList");
  };

  return (
    <>
      <div className="grid-wrapper">
        <div className="grid-background"></div>
      </div>
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
          <div className="robot-face">
            <div ref={eyesRef} className="eyes"></div>
          </div>
        </div>
        <div ref={invitationRef} className="invitation">
          <div className="corner corner-top-left"></div>
          <div className="corner corner-top-right"></div>
          <div className="corner corner-bottom-left"></div>
          <div className="corner corner-bottom-right"></div>

          <input
            className="invitation-input"
            type="text"
            placeholder="输入测试邀请码"
          />
          <button className="invitation-button" onClick={handleNavigateToChat}>
            <img src="/enter.svg" alt="enter" />
          </button>
        </div>
      </div>
    </>
  );
}
