"use client"

import { useState, useEffect, useRef, useCallback, CSSProperties } from "react"
import { useTheme } from "./theme-provider"

interface MacbookProProps {
  src?: string
  images?: string[]
  description?: string
  width?: number
  className?: string
}

export default function MacbookPro({ src, images, description, width = 440, className = "" }: MacbookProProps) {

  const [hovered, setHovered] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifBig, setNotifBig] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [termInput, setTermInput] = useState("")
  const [termLines, setTermLines] = useState<{ text: string; color?: string }[]>([])
  const [scales, setScales] = useState<number[]>([])
  const dockRef    = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const termBodyRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetScales = useRef<number[]>([])
  const currentScales = useRef<number[]>([])
  const { theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const imgList: string[] = images && images.length > 0 ? images : src ? [src] : []
  const currentSrc = imgList[activeImg] ?? null
  const hasDock = imgList.length > 1

  useEffect(() => {
    if (!hovered) {
      setShowNotif(false)
      setNotifBig(false)
      return
    }
    const show   = setTimeout(() => setShowNotif(true),  300)
    const expand = setTimeout(() => setNotifBig(true),   500)
    const shrink = setTimeout(() => setNotifBig(false), 2400)
    const hide   = setTimeout(() => setShowNotif(false), 2900)
    return () => { clearTimeout(show); clearTimeout(expand); clearTimeout(shrink); clearTimeout(hide) }
  }, [hovered])

  useEffect(() => { setActiveImg(0) }, [images, src])

  // Auto-focus input when terminal opens
  useEffect(() => {
    if (terminalOpen) setTimeout(() => inputRef.current?.focus(), 50)
    else { setTermLines([]); setTermInput("") }
  }, [terminalOpen])

  // Auto-scroll terminal body
  useEffect(() => {
    if (termBodyRef.current) termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight
  }, [termLines])

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
      opacity: showNotif ? 0 : 1,
      transition: "opacity 0.2s",
    },
    cam:    { width: 4, height: 4, borderRadius: "50%", background: "#141414", border: "1px solid #1c1c1c", flexShrink: 0 },
    micDot: { width: 2, height: 2, borderRadius: "50%", background: "#1a1a1a", flexShrink: 0 },
    notifPill: {
      position: "absolute",
      top: 4, left: "50%",
      transform: "translateX(-50%)",
      width: notifBig ? 172 : 44,
      height: notifBig ? 28 : 10,
      opacity: showNotif ? 1 : 0,
      background: "#000",
      borderRadius: 20,
      padding: notifBig ? "0 8px" : 0,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      fontSize: 7, fontWeight: 500, color: "#fff",
      whiteSpace: "nowrap", overflow: "hidden",
      zIndex: 12,
      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      transition: "width 0.4s cubic-bezier(0.22,0.6,0.32,1), height 0.4s cubic-bezier(0.22,0.6,0.32,1), opacity 0.25s ease",
      pointerEvents: "none",
    },
    notifContent: {
      opacity: notifBig ? 1 : 0,
      transition: "opacity 0.2s ease",
      display: "flex", alignItems: "center", gap: 4,
    },
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

          {/* Dynamic Island — iMessage from Zakaria */}
          <div style={s.notifPill}>
            <div style={s.notifContent}>
              {/* Messages app icon */}
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                background: "linear-gradient(145deg, #34c759, #30b350)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
              </div>
              {/* Text */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 6.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 0.3, lineHeight: 1 }}>
                  Zakaria
                </span>
                <span style={{ fontSize: 7, fontWeight: 500, color: "#fff", lineHeight: 1, whiteSpace: "nowrap" }}>
                  Let's build something for u 🤝
                </span>
              </div>
            </div>
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

              {/* Terminal overlay */}
              {terminalOpen && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 20,
                  background: "rgba(0,0,0,0.82)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 10,
                  animation: "mbFade 0.2s ease",
                }}>
                  <div style={{
                    width: "100%", maxWidth: "72%",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "rgba(18,18,20,0.97)",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
                    fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
                    fontSize: Math.round(w * 0.022),
                    lineHeight: 1.6,
                  }}>
                    {/* Title bar */}
                    <div style={{
                      height: Math.round(w * 0.052),
                      background: "rgba(28,28,30,0.98)",
                      borderBottom: "0.5px solid rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center",
                      padding: `0 ${Math.round(w * 0.02)}px`, gap: 5,
                      position: "relative",
                    }}>
                      {/* Traffic lights */}
                      {[
                        { bg: "#ff5f57", onClick: () => { setTerminalOpen(false); setTermLines([]); setTermInput("") } },
                        { bg: "#febc2e", onClick: undefined },
                        { bg: "#28c840", onClick: undefined },
                      ].map((btn, i) => (
                        <div
                          key={i}
                          onClick={(e) => { e.stopPropagation(); btn.onClick?.() }}
                          style={{
                            width: Math.round(w * 0.025), height: Math.round(w * 0.025),
                            borderRadius: "50%", background: btn.bg, cursor: btn.onClick ? "pointer" : "default",
                            flexShrink: 0, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3)",
                          }}
                        />
                      ))}
                      <span style={{
                        position: "absolute", left: "50%", transform: "translateX(-50%)",
                        fontSize: Math.round(w * 0.02), color: "rgba(255,255,255,0.3)",
                        fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", fontWeight: 500,
                        letterSpacing: 0.2, pointerEvents: "none",
                      }}>
                        terminal
                      </span>
                    </div>

                    {/* Output area */}
                    <div
                      ref={termBodyRef}
                      style={{
                        padding: `${Math.round(w * 0.018)}px ${Math.round(w * 0.022)}px`,
                        minHeight: Math.round(w * 0.18),
                        maxHeight: Math.round(w * 0.26),
                        overflowY: "auto", scrollbarWidth: "none",
                      }}
                    >
                      {termLines.map((line, i) => (
                        <div key={i} style={{ color: line.color ?? "rgba(255,255,255,0.75)", paddingBottom: 1 }}>
                          {line.text}
                        </div>
                      ))}

                      {/* Input row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <span style={{ color: "#30d158", fontWeight: 600, flexShrink: 0 }}>➜ </span>
                        <span style={{ color: "#64d2ff", flexShrink: 0 }}>~ </span>
                        <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>$ </span>
                        <input
                          ref={inputRef}
                          value={termInput}
                          onChange={(e) => setTermInput(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { e.stopPropagation() }}
                          autoFocus
                          spellCheck={false}
                          style={{
                            flex: 1, background: "transparent", border: "none", outline: "none",
                            color: "#e2e8f0", fontSize: "inherit", fontFamily: "inherit",
                            caretColor: "#30d158",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
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

                    {/* Dock separator + terminal icon */}
                    {description && <>
                      <div style={{
                        width: 0.5, height: slotSize * 0.7, alignSelf: "center",
                        background: "rgba(255,255,255,0.2)", borderRadius: 1, flexShrink: 0,
                        marginLeft: 1, marginRight: 1,
                      }} />
                      <div
                        style={{
                          width: slotSize, height: slotSize, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", overflow: "visible",
                        }}
                        onClick={(e) => { e.stopPropagation(); setTerminalOpen(o => !o) }}
                      >
                        <div style={{
                          width: slotSize, height: slotSize,
                          borderRadius: Math.round(slotSize * 0.22),
                          background: terminalOpen
                            ? "linear-gradient(145deg,#1a1a2e,#16213e)"
                            : "linear-gradient(145deg,#1c1c1e,#2c2c2e)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: terminalOpen
                            ? "0 0 0 1.5px #30d158, 0 2px 8px rgba(0,0,0,0.6)"
                            : "0 1px 5px rgba(0,0,0,0.6)",
                          transition: "box-shadow 0.2s, background 0.2s",
                          flexShrink: 0,
                        }}>
                          <svg width={slotSize * 0.5} height={slotSize * 0.5} viewBox="0 0 24 24" fill="none">
                            <polyline points="4 17 10 11 4 5" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="19" x2="20" y2="19" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    </>}
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
