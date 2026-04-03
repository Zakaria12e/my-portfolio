"use client"

import { useState, useEffect, useRef, useCallback, CSSProperties } from "react"
import { useTheme } from "./theme-provider"

interface MacbookProProps {
  src?: string
  images?: string[]
  width?: number
  className?: string
}

export default function MacbookPro({ src, images, width = 440, className = "" }: MacbookProProps) {
  const [hovered, setHovered] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [scales, setScales] = useState<number[]>([])
  const dockRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetScales = useRef<number[]>([])
  const currentScales = useRef<number[]>([])
  const { theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const imgList: string[] = images && images.length > 0 ? images : src ? [src] : []
  const currentSrc = imgList[activeImg] ?? null
  const hasDock = imgList.length > 1

  useEffect(() => { setActiveImg(0) }, [images, src])

  useEffect(() => {
    const ones = imgList.map(() => 1)
    targetScales.current = [...ones]
    currentScales.current = [...ones]
    setScales(ones)
  }, [imgList.length])

  const w = width
  const h = Math.round(w * 0.609)
  const baseW = Math.round(w * 1.09)
  const baseH = Math.round(w * 0.03)

  const ICON_BASE  = Math.round(w * 0.052)
  const ICON_GAP   = Math.round(w * 0.011)
  const DOCK_PAD_X = Math.round(w * 0.015)
  const DOCK_PAD_Y = Math.round(w * 0.009)
  const MAX_SCALE  = 1.55          // subtle — like real macOS at normal dock size
  const RANGE      = ICON_BASE * 2.2

  const startSpring = useCallback(() => {
    if (rafRef.current !== null) return
    const loop = () => {
      let done = true
      const next = currentScales.current.map((cur, i) => {
        const tgt = targetScales.current[i] ?? 1
        const diff = tgt - cur
        if (Math.abs(diff) < 0.0015) return tgt
        done = false
        return cur + diff * 0.24  // snappy spring
      })
      currentScales.current = next
      setScales([...next])
      rafRef.current = done ? null : requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const computeTargets = useCallback((mouseX: number) => {
    if (!dockRef.current) return
    const rect = dockRef.current.getBoundingClientRect()
    const rel = mouseX - rect.left
    targetScales.current = imgList.map((_, idx) => {
      const center = DOCK_PAD_X + idx * (ICON_BASE + ICON_GAP) + ICON_BASE / 2
      const dist = Math.abs(rel - center)
      if (dist >= RANGE) return 1
      // smooth cosine bell — peak at cursor, tapers to 1 at edges
      const t = Math.cos((dist / RANGE) * (Math.PI / 2))
      return 1 + (MAX_SCALE - 1) * t * t
    })
    startSpring()
  }, [imgList, ICON_BASE, ICON_GAP, DOCK_PAD_X, RANGE, startSpring])

  const resetTargets = useCallback(() => {
    targetScales.current = imgList.map(() => 1)
    startSpring()
  }, [imgList, startSpring])

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }, [])

  const s: Record<string, CSSProperties> = {
    scene: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
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
      top: 5, left: 5, right: 5, bottom: 5,
      background: isDark ? "#0a0a0c" : "#1a1a1c",
      borderRadius: "6px 6px 0 0",
      overflow: "hidden",
    },
    notch: {
      position: "absolute",
      top: 4, left: "50%",
      transform: "translateX(-50%)",
      width: 44, height: 10,
      background: "#000",
      borderRadius: 20,
      zIndex: 10,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    },
    cam:    { width: 4, height: 4, borderRadius: "50%", background: "#141414", border: "1px solid #1c1c1c", flexShrink: 0 },
    micDot: { width: 2, height: 2, borderRadius: "50%", background: "#1a1a1a", flexShrink: 0 },
    screen: {
      position: "absolute", inset: 0,
      borderRadius: "6px 6px 0 0",
      overflow: "hidden",
      background: "#090909",
      zIndex: 1,
    },
    screenOff: {
      position: "absolute", inset: 0,
      background: "#090909",
      zIndex: 5,
      borderRadius: "inherit",
      opacity: hovered ? 0 : 1,
      pointerEvents: hovered ? "none" : "auto",
      transition: "opacity 0.5s 0.05s",
    },
    screenOn: {
      position: "absolute", inset: 0,
      zIndex: 2,
      borderRadius: "inherit",
      overflow: "hidden",
      opacity: hovered ? 1 : 0,
      transition: "opacity 0.45s 0.45s",
    },
    hingeBump: {
      position: "absolute", top: 0, left: "50%",
      transform: "translateX(-50%)",
      width: 80, height: 5,
      background: isDark
        ? "linear-gradient(180deg,#4a4a4e 0%,#3a3a3c 100%)"
        : "linear-gradient(180deg,#c0c0c2 0%,#b0b0b2 100%)",
      borderRadius: "0 0 6px 6px",
      border: isDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderTop: "none",
      boxShadow: isDark
        ? "0 2px 4px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 2px 4px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.5)",
      zIndex: 20,
    },
    base: {
      width: baseW, height: baseH,
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
      width: Math.round(w * 0.91), height: 12,
      background: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
      borderRadius: "50%",
      filter: "blur(12px)",
      marginTop: 2,
    },
  }

  // Fixed slot size — icons scale via CSS transform, no layout reflow
  const slotSize = ICON_BASE
  // Reserve enough vertical room for the tallest possible scaled icon
  const dockH = Math.round(ICON_BASE * MAX_SCALE) + DOCK_PAD_Y * 2 + 4

  return (
    <div
      className={className}
      style={s.scene}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.lid}>
        <div style={s.bezel}>
          <div style={s.notch}>
            <div style={s.micDot} />
            <div style={s.cam} />
          </div>

          <div style={s.screen}>
            <div style={s.screenOff} />
            <div style={s.screenOn}>

              {/* Screenshot */}
              {currentSrc ? (
                <img
                  key={activeImg}
                  src={currentSrc}
                  alt="screen"
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                    animation: "mbFade 0.3s ease",
                  }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "#0a0a0c" }} />
              )}

              {/* Dock */}
              {hasDock && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0, left: 0, right: 0,
                    height: dockH,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: 4,
                    zIndex: 10,
                    // allow scaled icons to overflow dock container upward
                    overflow: "visible",
                    pointerEvents: hovered ? "auto" : "none",
                  }}
                >
                  <div
                    ref={dockRef}
                    onMouseMove={(e) => computeTargets(e.clientX)}
                    onMouseLeave={resetTargets}
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: ICON_GAP,
                      paddingLeft: DOCK_PAD_X,
                      paddingRight: DOCK_PAD_X,
                      paddingTop: DOCK_PAD_Y,
                      paddingBottom: DOCK_PAD_Y,
                      background: "rgba(210,210,220,0.15)",
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                      borderRadius: Math.round(ICON_BASE * 0.48),
                      border: "0.5px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 2px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                      overflow: "visible",
                    }}
                  >
                    {imgList.map((imgSrc, idx) => {
                      const scale = scales[idx] ?? 1
                      const isActive = idx === activeImg
                      return (
                        <div
                          key={idx}
                          style={{
                            // fixed slot — transform handles visual size, no reflow
                            width: slotSize,
                            height: slotSize,
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            cursor: "pointer",
                            // overflow visible so scaled icon shows above dock bar
                            overflow: "visible",
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveImg(idx)
                          }}
                        >
                          <div
                            style={{
                              width: slotSize,
                              height: slotSize,
                              // scale via transform — no layout shift
                              transform: `scale(${scale})`,
                              transformOrigin: "bottom center",
                              willChange: "transform",
                              borderRadius: Math.round(slotSize * 0.22),
                              overflow: "hidden",
                              boxShadow: isActive
                                ? "0 0 0 1.5px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.5)"
                                : "0 1px 5px rgba(0,0,0,0.5)",
                              transition: "box-shadow 0.2s",
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={imgSrc}
                              alt={`view ${idx + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              draggable={false}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Active dots row — separate so they don't affect icon layout */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 1,
                      display: "flex",
                      gap: ICON_GAP,
                      paddingLeft: DOCK_PAD_X,
                      paddingRight: DOCK_PAD_X,
                      pointerEvents: "none",
                    }}
                  >
                    {imgList.map((_, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: slotSize,
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 2.5, height: 2.5,
                            borderRadius: "50%",
                            background: idx === activeImg ? "rgba(255,255,255,0.9)" : "transparent",
                            transition: "background 0.2s",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={s.base}>
        <div style={s.hingeBump} />
      </div>
      <div style={s.shadow} />

      <style>{`@keyframes mbFade { from { opacity:0 } to { opacity:1 } }`}</style>
    </div>
  )
}
