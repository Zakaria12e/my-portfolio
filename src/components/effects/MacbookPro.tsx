"use client"

import { useState, useEffect, CSSProperties } from "react"
import { useTheme } from "./theme-provider"

interface MacbookProProps {
  src?: string
  width?: number
  className?: string
}

export default function MacbookPro({ src, width = 440, className = "" }: MacbookProProps) {
  const [hovered, setHovered] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  useEffect(() => {
    if (!hovered) {
      setShowNotif(false)
      return
    }
    const show = setTimeout(() => setShowNotif(true), 300)
    const hide = setTimeout(() => setShowNotif(false), 2700)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [hovered])

  const w = width
  const h = Math.round(w * 0.609)
  const baseW = Math.round(w * 1.09)
  const baseH = Math.round(w * 0.03)

  const s: Record<string, CSSProperties> = {
    scene: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      cursor: "pointer",
      userSelect: "none",
    },
    lid: {
      width: w,
      height: h,
      background: isDark ? "#1e1e20" : "#e8e8ea",
      borderRadius: `${Math.round(w * 0.023)}px ${Math.round(w * 0.023)}px 0 0`,
      border: isDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
      borderBottom: "none",
      position: "relative",
      overflow: "hidden",
      transform: hovered
        ? "perspective(1200px) rotateX(0deg)"
        : "perspective(1200px) rotateX(8deg)",
      transformOrigin: "bottom center",
      transition: "transform 0.8s cubic-bezier(0.25,0.6,0.3,1)",
    },
    bezel: {
      position: "absolute",
      top: 5, left: 5, right: 5, bottom: 0,
      background: isDark ? "#0a0a0c" : "#1a1a1c",
      borderRadius: "6px 6px 0 0",
      overflow: "hidden",
    },
    notch: {
      position: "absolute",
      top: 3,
      left: "50%",
      transform: "translateX(-50%)",
      width: 72,
      height: 16,
      background: "#000",
      borderRadius: 20,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    cam: {
      width: 6, height: 6,
      borderRadius: "50%",
      background: "#141414",
      border: "1px solid #1c1c1c",
      position: "relative",
      flexShrink: 0,
    },
    micDot: {
      width: 3, height: 3,
      borderRadius: "50%",
      background: "#1a1a1a",
      flexShrink: 0,
    },
    screen: {
      position: "absolute",
      inset: 0,
      borderRadius: "6px 6px 0 0",
      overflow: "hidden",
      background: "#090909",
      zIndex: 1,
    },
    screenOff: {
      position: "absolute",
      inset: 0,
      background: "#090909",
      zIndex: 5,
      borderRadius: "inherit",
      opacity: hovered ? 0 : 1,
      transition: "opacity 0.5s 0.05s",
    },
    screenOn: {
      position: "absolute",
      inset: 0,
      zIndex: 2,
      borderRadius: "inherit",
      overflow: "hidden",
      opacity: hovered ? 1 : 0,
      transition: "opacity 0.45s 0.45s",
    },
    screenImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    mbar: {
      position: "absolute",
      top: 0, left: 0, right: 0,
      height: 18,
      background: "rgba(20,20,22,0.55)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      padding: "0 7px",
      gap: 7,
      zIndex: 6,
    },
    mbarText: {
      fontSize: 7,
      fontWeight: 500,
      color: "rgba(255,255,255,0.85)",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    },
    mbarDim: {
      fontSize: 7,
      color: "rgba(255,255,255,0.5)",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    },
    mbarRight: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 4,
    },
    battWrap: { display: "flex", alignItems: "center", gap: 1 },
    battBody: {
      width: 15, height: 7,
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: 2,
      padding: 1,
      position: "relative",
    },
    battFill: {
      height: "100%", width: "60%",
      background: "#32d74b",
      borderRadius: 1,
    },
    battNub: {
      width: 2, height: 4,
      background: "rgba(255,255,255,0.2)",
      borderRadius: "0 1px 1px 0",
    },
    notifPill: {
      position: "absolute",
      top: 22,
      left: "50%",
      transform: showNotif
        ? "translateX(-50%) translateY(0px)"
        : "translateX(-50%) translateY(-36px)",
      opacity: showNotif ? 1 : 0,
      background: "#1d1d1f",
      borderRadius: 20,
      padding: "3px 9px 3px 6px",
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 7.5,
      fontWeight: 500,
      color: "#fff",
      whiteSpace: "nowrap",
      zIndex: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.22,0.6,0.32,1)",
      pointerEvents: "none",
    },
    notifBattShell: {
      width: 15, height: 7,
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: 2,
      padding: 1,
      position: "relative",
    },
    notifBattFill: {
      height: "100%", width: "58%",
      background: "#32d74b",
      borderRadius: 1,
    },
    notifNub: {
      width: 2, height: 4,
      background: "rgba(255,255,255,0.2)",
      borderRadius: "0 1px 1px 0",
    },
    green: { color: "#32d74b", fontWeight: 600 },
    hingeBump: {
      position: "absolute",
      top: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: 80, height: 5,
      background: isDark
        ? "linear-gradient(180deg, #4a4a4e 0%, #3a3a3c 100%)"
        : "linear-gradient(180deg, #c0c0c2 0%, #b0b0b2 100%)",
      borderRadius: "0 0 6px 6px",
      border: isDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderTop: "none",
      boxShadow: isDark
        ? "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)",
      zIndex: 20,
    },
    base: {
      width: baseW,
      height: baseH,
      background: isDark
        ? "linear-gradient(180deg,#2c2c2e 0%,#222224 55%,#1a1a1c 100%)"
        : "linear-gradient(180deg,#dcdcde 0%,#d0d0d2 55%,#c8c8ca 100%)",
      borderRadius: "0 0 8px 8px",
      border: isDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderTop: isDark ? "1.5px solid #3a3a3c" : "1.5px solid #e8e8ea",
      transform: hovered
        ? "perspective(1200px) rotateX(-2deg)"
        : "perspective(1200px) rotateX(-4deg)",
      transformOrigin: "top center",
      transition: "transform 0.8s cubic-bezier(0.25,0.6,0.3,1)",
      position: "relative",
    },
    shadow: {
      width: Math.round(w * 0.91),
      height: 12,
      background: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
      borderRadius: "50%",
      filter: "blur(12px)",
      marginTop: 2,
    },
  }

  const applePath =
    "M36.8 28c-.1-6.9 5.6-10.2 5.9-10.4-3.2-4.7-8.2-5.3-10-5.4-4.3-.4-8.3 2.5-10.5 2.5s-5.5-2.4-9-2.4C7.6 12.4 2 16 2 23.8c0 4.9 1.9 10 4.3 13.3 2.3 3.3 5 6.9 8.6 6.8 3.4-.1 4.8-2.2 8.9-2.2s5.4 2.2 8.9 2.1c3.7-.1 6-3.3 8.2-6.6 2.6-3.7 3.7-7.4 3.7-7.5-.1-.1-6.8-2.6-6.8-10.2zM29.3 8c1.9-2.3 3.2-5.5 2.8-8.6-2.7.1-6 1.8-7.9 4.1-1.7 2-3.3 5.2-2.9 8.3 3 .2 6.1-1.5 8-3.8z"
  const boltPath = "M2.8 0.3L0.5 3.5H2.5L1.8 6.7L4.5 3.5H2.5Z"

  return (
    <div
      className={className}
      style={s.scene}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* LID */}
      <div style={s.lid}>
        <div style={s.bezel}>
          <div style={s.notch}>
            <div style={s.micDot} />
            <div style={s.cam} />
          </div>
          <div style={s.screen}>
            <div style={s.screenOff} />
            <div style={s.screenOn}>
              {src ? (
                <img src={src} alt="screen" style={s.screenImg} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#0a0a0c" }} />
              )}
              <div style={s.notifPill}>
                <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <div style={s.notifBattShell}>
                    <div style={s.notifBattFill} />
                    <svg
                      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                      width="5" height="7" viewBox="0 0 5 7" fill="none"
                    >
                      <path d={boltPath} fill="#32d74b" />
                    </svg>
                  </div>
                  <div style={s.notifNub} />
                </div>
                Charging &nbsp;<span style={s.green}>63%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base */}
      <div style={s.base}>
        <div style={s.hingeBump} />
      </div>

      {/* Ground shadow */}
      <div style={s.shadow} />
    </div>
  )
}
