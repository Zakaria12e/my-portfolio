"use client"

import { useState, useEffect, useRef, useCallback, useMemo, CSSProperties } from "react"
import { useTheme } from "./theme-provider"

interface ProjectItem {
  id?: number
  title?: string
  category?: string
  images?: string[]
  description?: string
  githubUrl?: string
  liveUrl?: string
  tags?: string[]
  features?: string[]
}

interface MacbookProProps {
  src?: string
  images?: string[]
  description?: string
  githubUrl?: string
  liveUrl?: string
  tags?: string[]
  features?: string[]
  projects?: ProjectItem[]
  width?: number
  className?: string
}

const COMMANDS = ["desc", "stack", "features", "github", "live", "clear", "cls", "help", "cd"]

function resolvePath(cwd: string, target: string): string {
  if (!target || target === "~") return "~"
  if (target === "..") {
    if (cwd === "~") return "~"
    const last = cwd.lastIndexOf("/")
    return last <= 0 ? "~" : cwd.slice(0, last)
  }
  if (target.startsWith("~/")) return target
  return cwd === "~" ? `~/${target}` : `${cwd}/${target}`
}

function getDirs(cwd: string, slugs: string[]): string[] {
  if (cwd === "~") return ["projects"]
  if (cwd === "~/projects") return [...slugs, ".."]
  if (/^~\/projects\/[^/]+$/.test(cwd)) return ["src", "public", ".."]
  return [".."]
}

export default function MacbookPro({ src, images: imagesProp, description: descProp, githubUrl: githubProp, liveUrl: liveProp, tags: tagsProp, features: featuresProp, projects, width = 440, className = "" }: MacbookProProps) {

  const [activeProject, setActiveProject] = useState(0)
  const [quickLookOpen, setQuickLookOpen] = useState(false)
  const [quickLookIdx, setQuickLookIdx] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifBig, setNotifBig] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [termMinimized, setTermMinimized] = useState(false)
  const [termMinimizing, setTermMinimizing] = useState(false)
  const [termMaximized, setTermMaximized] = useState(false)
  const [finderOpen, setFinderOpen] = useState(false)
  const [finderSel, setFinderSel] = useState<string | null>(null)
  const [finderSidebarSel, setFinderSidebarSel] = useState("project")
  const [termInput, setTermInput] = useState("")
  const [termCwd, setTermCwd] = useState("~")
  const [termLines, setTermLines] = useState<{ text: string; color?: string }[]>([])
  const [scales, setScales] = useState<number[]>([])
  const [termOrigin, setTermOrigin]   = useState("50% 100%")
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const screenRef   = useRef<HTMLDivElement>(null)
  const dockRef     = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const termBodyRef = useRef<HTMLDivElement>(null)
  const iconRefs    = useRef<(HTMLDivElement | null)[]>([])
  const focusedDockIdxRef = useRef(-1)
  const rafRef = useRef<number | null>(null)
  const targetScales = useRef<number[]>([])
  const currentScales = useRef<number[]>([])
  const { theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  // Derive active project data
  const proj = projects?.[activeProject]
  const images = proj?.images ?? imagesProp
  const description = proj?.description ?? descProp
  const githubUrl = proj?.githubUrl ?? githubProp
  const liveUrl = proj?.liveUrl ?? liveProp
  const tags = proj?.tags ?? tagsProp
  const features = proj?.features ?? featuresProp

  const imgList: string[] = images && images.length > 0 ? images : src ? [src] : []
  const currentSrc = imgList[activeImg] ?? null
  // In projects mode, dock icons = one per project; otherwise = one per image
  const dockCount = projects ? projects.length : imgList.length
  const hasDock = dockCount > 1
  const hasGithub = !!githubUrl && githubUrl !== "#"

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
  const prevActiveProjectRef = useRef(-1)
  useEffect(() => {
    const fromTerminal = prevActiveProjectRef.current !== -1 && terminalOpen
    prevActiveProjectRef.current = activeProject
    setActiveImg(0)
    if (!fromTerminal) {
      setTerminalOpen(false)
      setTermMinimized(false)
      setTermMinimizing(false)
    }
    setFinderOpen(false)
    setFinderSel(null)
  }, [activeProject])

  const getOrigin = (e: React.MouseEvent): string => {
    const rect = screenRef.current?.getBoundingClientRect()
    if (!rect) return "50% 100%"
    const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + "%"
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + "%"
    return `${x} ${y}`
  }

  const projectSlug = (proj?.title ?? description ?? "project")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allProjectSlugs = useMemo(() =>
    (projects ?? []).map(p =>
      (p.title ?? "project").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    ), [projects?.length])

  const runCommand = useCallback((raw: string, cwd: string) => {
    const cmd = raw.trim().toLowerCase()
    const dimColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"
    const cwdDisplay = cwd.replace("~", "~")
    const echo = { text: `➜  ${cwdDisplay} $ ${raw}`, color: dimColor }

    if (cmd.startsWith("cd")) {
      const target = raw.trim().slice(2).trim()
      const newCwd = resolvePath(cwd, target || "~")
      const valid = [
        "~", "~/projects",
        ...allProjectSlugs.map(s => `~/projects/${s}`),
        ...allProjectSlugs.flatMap(s => [`~/projects/${s}/src`, `~/projects/${s}/public`]),
      ]
      if (valid.includes(newCwd)) {
        setTermCwd(newCwd)
        // auto-switch project when cd-ing into a project dir
        const m = newCwd.match(/^~\/projects\/([^/]+)/)
        if (m) {
          const idx = allProjectSlugs.indexOf(m[1])
          if (idx >= 0) setActiveProject(idx)
        }
        setTermLines(l => [...l, echo])
      } else {
        setTermLines(l => [...l, echo,
          { text: `  cd: no such file or directory: ${target || "~"}`, color: "#ff453a" },
        ])
      }
    } else if (cmd === "desc" || cmd === "description") {
      setTermLines(l => [...l, echo,
        { text: description ?? "No description available.", color: "#e2e8f0" },
      ])
    } else if (cmd === "stack") {
      setTermLines(l => [...l, echo,
        ...(tags && tags.length > 0
          ? tags.map(t => ({ text: `  · ${t}`, color: "#64d2ff" }))
          : [{ text: "  No stack info available.", color: "#e2e8f0" }]
        ),
      ])
    } else if (cmd === "features") {
      setTermLines(l => [...l, echo,
        ...(features && features.length > 0
          ? features.map(f => ({ text: `  ✦ ${f}`, color: "#e2e8f0" }))
          : [{ text: "  No features listed.", color: "#e2e8f0" }]
        ),
      ])
    } else if (cmd === "github") {
      if (githubUrl && githubUrl !== "#") {
        setTermLines(l => [...l, echo, { text: `  Opening GitHub…`, color: "#30d158" }])
        window.open(githubUrl, "_blank", "noopener,noreferrer")
      } else {
        setTermLines(l => [...l, echo, { text: "  No GitHub repo available.", color: "#ff453a" }])
      }
    } else if (cmd === "live") {
      if (liveUrl && liveUrl !== "#") {
        setTermLines(l => [...l, echo, { text: `  Opening live demo…`, color: "#30d158" }])
        window.open(liveUrl, "_blank", "noopener,noreferrer")
      } else {
        setTermLines(l => [...l, echo, { text: "  No live demo available.", color: "#ff453a" }])
      }
    } else if (cmd === "clear" || cmd === "cls") {
      setTermLines([])
    } else if (cmd === "help") {
      setTermLines(l => [...l, echo,
        { text: "  desc      — project description",  color: "#64d2ff" },
        { text: "  stack     — tech stack",            color: "#64d2ff" },
        { text: "  features  — key features",          color: "#64d2ff" },
        { text: "  github    — open GitHub repo",      color: "#64d2ff" },
        { text: "  live      — open live demo",        color: "#64d2ff" },
        { text: "  cd <dir>  — navigate directories",  color: "#64d2ff" },
        { text: "  clear/cls — clear terminal",        color: "#64d2ff" },
      ])
    } else if (cmd === "") {
      setTermLines(l => [...l, echo])
    } else {
      setTermLines(l => [...l, echo,
        { text: `command not found: ${cmd}  (try: help)`, color: "#ff453a" },
      ])
    }
    setTermInput("")
  }, [description, tags, features, githubUrl, liveUrl, projectSlug, isDark, allProjectSlugs, setActiveProject])

  // Auto-focus input + show welcome hint when terminal opens
  useEffect(() => {
    if (terminalOpen) {
      const cwd = `~/projects/${projectSlug}`
      setTermCwd(cwd)
      setTermLines([
        { text: "Type  help  to see available commands.", color: "#ffd60a" },
        { text: "Tip   ⇥ Tab  to autocomplete commands & paths.", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" },
      ])
      setTermMinimized(false)
      setTermMinimizing(false)
      setTermMaximized(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTermLines([])
      setTermInput("")
      setTermCwd("~")
      setTermMinimized(false)
      setTermMinimizing(false)
      setTermMaximized(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalOpen, projectSlug])

  // Auto-scroll terminal body
  useEffect(() => {
    if (termBodyRef.current) termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight
  }, [termLines])

  useEffect(() => {
    const totalSlots = 1 + dockCount + (description ? 1 : 0) + (hasGithub ? 1 : 0)
    const ones = Array(totalSlots).fill(1)
    targetScales.current = [...ones]
    currentScales.current = [...ones]
    setScales(ones)
  }, [dockCount, description, hasGithub])

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
    targetScales.current = iconRefs.current.map((el) => {
      if (!el) return 1
      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const dist = Math.abs(mouseX - center)
      if (dist >= RANGE) return 1
      const t = Math.cos((dist / RANGE) * (Math.PI / 2))
      return 1 + (MAX_SCALE - 1) * t * t
    })
    startSpring()
  }, [RANGE, startSpring])

  const resetTargets = useCallback(() => {
    targetScales.current = iconRefs.current.map(() => 1)
    startSpring()
  }, [startSpring])

  // All navigable dock items in order — defined after computeTargets
  const dockItems = useMemo(() => [
    { type: "finder" as const, refIdx: 0 },
    ...(projects
      ? projects.map((_, i) => ({ type: "project" as const, projIdx: i, refIdx: i + 1 }))
      : imgList.map((_, i) => ({ type: "image" as const, imgIdx: i, refIdx: i + 1 }))
    ),
    ...(description ? [{ type: "terminal" as const, refIdx: dockCount + 1 }] : []),
    ...(hasGithub   ? [{ type: "github"   as const, refIdx: dockCount + 1 + (description ? 1 : 0) }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projects?.length, imgList.length, dockCount, description, hasGithub])

  // Reset focus when MacBook loses hover
  useEffect(() => {
    if (!hovered) focusedDockIdxRef.current = -1
  }, [hovered])

  // Keyboard shortcuts — only active while MacBook is hovered
  useEffect(() => {
    if (!hovered) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (termMinimized) {
          setTermMinimized(false)
          setTimeout(() => inputRef.current?.focus(), 50)
        } else {
          setTerminalOpen(o => !o)
        }
        return
      }
      if (e.key === "Escape") {
        setTerminalOpen(false)
        setFinderOpen(false)
        setQuickLookOpen(false)
        return
      }
      if (quickLookOpen && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault()
        setQuickLookIdx(i => {
          const next = e.key === "ArrowRight"
            ? Math.min(i + 1, imgList.length - 1)
            : Math.max(i - 1, 0)
          setActiveImg(next)
          return next
        })
        return
      }
      if ((!terminalOpen || termMinimized) && !quickLookOpen && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault()
        const cur  = focusedDockIdxRef.current
        const next = e.key === "ArrowRight"
          ? (cur + 1) % dockItems.length
          : (cur - 1 + dockItems.length) % dockItems.length
        focusedDockIdxRef.current = next
        const item = dockItems[next]
        const el = iconRefs.current[item.refIdx]
        if (el) {
          const rect = el.getBoundingClientRect()
          computeTargets(rect.left + rect.width / 2)
        }
        if (item.type === "image") setActiveImg(item.imgIdx)
        if (item.type === "project") setActiveProject(item.projIdx)
      }
      if ((!terminalOpen || termMinimized) && e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        const item = dockItems[focusedDockIdxRef.current]
        if (!item) return
        if (item.type === "finder") { setFinderOpen(o => !o) }
        if (item.type === "project") { setActiveProject(item.projIdx) }
        if (item.type === "terminal") {
          if (termMinimized) { setTermMinimized(false); setTimeout(() => inputRef.current?.focus(), 50) }
          else setTerminalOpen(true)
        }
        if (item.type === "github" && githubUrl && githubUrl !== "#")
          window.open(githubUrl, "_blank", "noopener,noreferrer")
      }
    }
    window.addEventListener("keydown", onKey, { capture: true })
    return () => window.removeEventListener("keydown", onKey, { capture: true })
  }, [hovered, terminalOpen, termMinimized, finderOpen, quickLookOpen, imgList.length, dockItems, computeTargets, githubUrl])

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
    ? "perspective(1400px) rotateX(5deg) scaleY(1)"
    : "perspective(1400px) rotateX(-65deg) scaleY(0.92)",
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

          <div ref={screenRef} style={s.screen}>
            <div style={s.screenOff} />
            <div style={s.screenOn}>

              {/* Screenshot */}
              {currentSrc ? (
                <img
                  key={activeImg}
                  src={currentSrc}
                  alt="screen"
                  onClick={imgList.length > 1 ? (e) => { e.stopPropagation(); setQuickLookIdx(activeImg); setQuickLookOpen(true) } : undefined}
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                    animation: "mbImg 1.4s cubic-bezier(0.16,1,0.3,1)",
                    cursor: imgList.length > 1 ? "zoom-in" : "default",
                  }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "#0a0a0c" }} />
              )}

              {/* Quick Look */}
              {quickLookOpen && imgList.length > 1 && (() => {
                const filmH  = Math.round(h * 0.18)
                const barH   = Math.round(h * 0.11)
                const thumbW = Math.round(filmH * 0.72)
                const thumbH = Math.round(thumbW * 0.63)
                const btnSz  = Math.round(w * 0.048)
                const nav = (dir: 1 | -1) => {
                  const next = Math.max(0, Math.min(imgList.length - 1, quickLookIdx + dir))
                  setQuickLookIdx(next)
                  setActiveImg(next)
                }
                return (
                  <div
                    onClick={(e) => { e.stopPropagation(); setQuickLookOpen(false) }}
                    style={{
                      position: "absolute", inset: 0, zIndex: 30,
                      background: "rgba(10,10,12,0.93)",
                      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                      display: "flex", flexDirection: "column",
                      animation: "qlIn 0.2s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        height: barH, flexShrink: 0,
                        display: "flex", alignItems: "center",
                        padding: `0 ${Math.round(w * 0.028)}px`,
                        background: "rgba(255,255,255,0.03)",
                        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
                        position: "relative",
                      }}
                    >
                      <div style={{ width: Math.round(w * 0.08), flexShrink: 0 }} />
                      {/* Title + counter */}
                      <div style={{
                        position: "absolute", left: "50%", transform: "translateX(-50%)",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                        pointerEvents: "none",
                      }}>
                        <span style={{
                          fontSize: Math.round(w * 0.024), fontWeight: 600,
                          color: "rgba(255,255,255,0.9)", letterSpacing: -0.3,
                          fontFamily: "-apple-system,'SF Pro Display',BlinkMacSystemFont,sans-serif",
                        }}>{proj?.title ?? "Quick Look"}</span>
                        <span style={{
                          fontSize: Math.round(w * 0.018), color: "rgba(255,255,255,0.35)",
                          fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                        }}>{quickLookIdx + 1} of {imgList.length}</span>
                      </div>
                      {/* Hint */}
                      <div style={{
                        marginLeft: "auto", fontSize: Math.round(w * 0.017),
                        color: "rgba(255,255,255,0.25)",
                        fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <kbd style={{ padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.12)" }}>←</kbd>
                        <kbd style={{ padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.12)" }}>→</kbd>
                        <span>navigate</span>
                      </div>
                    </div>

                    {/* Main viewer */}
                    <div
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: `${Math.round(h * 0.02)}px` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        key={quickLookIdx}
                        src={imgList[quickLookIdx]}
                        alt={`screenshot ${quickLookIdx + 1}`}
                        style={{
                          maxWidth: "100%", maxHeight: "100%",
                          objectFit: "contain", borderRadius: 5,
                          boxShadow: "0 4px 32px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.06)",
                          animation: "qlSlide 0.22s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                      {/* Prev */}
                      <div
                        onClick={(e) => { e.stopPropagation(); nav(-1) }}
                        style={{
                          position: "absolute", left: Math.round(w * 0.022),
                          width: btnSz, height: btnSz, borderRadius: "50%",
                          background: quickLookIdx === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)",
                          backdropFilter: "blur(10px)",
                          border: "0.5px solid rgba(255,255,255,0.12)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: quickLookIdx === 0 ? "default" : "pointer",
                          opacity: quickLookIdx === 0 ? 0.3 : 1,
                          transition: "opacity 0.15s",
                          pointerEvents: quickLookIdx === 0 ? "none" : "auto",
                        }}
                      >
                        <svg width={btnSz * 0.4} height={btnSz * 0.4} viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {/* Next */}
                      <div
                        onClick={(e) => { e.stopPropagation(); nav(1) }}
                        style={{
                          position: "absolute", right: Math.round(w * 0.022),
                          width: btnSz, height: btnSz, borderRadius: "50%",
                          background: quickLookIdx === imgList.length - 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)",
                          backdropFilter: "blur(10px)",
                          border: "0.5px solid rgba(255,255,255,0.12)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: quickLookIdx === imgList.length - 1 ? "default" : "pointer",
                          opacity: quickLookIdx === imgList.length - 1 ? 0.3 : 1,
                          transition: "opacity 0.15s",
                          pointerEvents: quickLookIdx === imgList.length - 1 ? "none" : "auto",
                        }}
                      >
                        <svg width={btnSz * 0.4} height={btnSz * 0.4} viewBox="0 0 24 24" fill="none">
                          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>

                    {/* Filmstrip */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        height: filmH, flexShrink: 0,
                        display: "flex", alignItems: "center",
                        gap: Math.round(w * 0.014),
                        padding: `${Math.round(h * 0.018)}px ${Math.round(w * 0.03)}px`,
                        overflowX: "auto", scrollbarWidth: "none",
                        background: "rgba(255,255,255,0.02)",
                        borderTop: "0.5px solid rgba(255,255,255,0.06)",
                        justifyContent: imgList.length <= 6 ? "center" : "flex-start",
                      }}
                    >
                      {imgList.map((src, i) => {
                        const active = i === quickLookIdx
                        return (
                          <div
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setQuickLookIdx(i); setActiveImg(i) }}
                            style={{
                              width: thumbW, height: thumbH, borderRadius: 5,
                              overflow: "hidden", flexShrink: 0, cursor: "pointer",
                              outline: active ? `2px solid rgba(255,255,255,0.85)` : "2px solid transparent",
                              outlineOffset: 2,
                              opacity: active ? 1 : 0.42,
                              transform: active ? "scale(1.06)" : "scale(1)",
                              transition: "opacity 0.18s, transform 0.18s, outline-color 0.18s",
                              boxShadow: active ? "0 4px 16px rgba(0,0,0,0.6)" : "none",
                            }}
                          >
                            <img src={src} alt={`thumb ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Terminal overlay */}
              {terminalOpen && !termMinimized && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 20,
                  background: termMinimizing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.82)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: termMinimizing ? undefined : "mbFade 0.15s ease",
                  transition: "background 0.36s ease",
                  pointerEvents: termMinimizing ? "none" : "auto",
                }}>
                  <div style={{
                    width: termMaximized ? "100%" : "72%",
                    height: termMaximized ? "100%" : "auto",
                    borderRadius: termMaximized ? 0 : 8,
                    overflow: "hidden",
                    background: "rgba(18,18,20,0.97)",
                    fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
                    fontSize: Math.round(w * 0.022),
                    lineHeight: 1.6,
                    display: "flex", flexDirection: "column",
                    transition: "width 0.2s ease, height 0.2s ease, border-radius 0.2s ease",
                    animation: termMinimizing
                      ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                      : "mbPaper 0.42s cubic-bezier(0.22,1,0.36,1)",
                    transformOrigin: termOrigin,
                  }}>
                    {/* Title bar */}
                    <div style={{
                      height: Math.round(w * 0.052),
                      background: "rgba(28,28,30,0.98)",
                      borderBottom: "0.5px solid rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center",
                      padding: `0 ${Math.round(w * 0.02)}px`, gap: 5,
                      position: "relative",
                      flexShrink: 0,
                    }}>
                      {[
                        { bg: "#ff5f57", fn: () => { setTerminalOpen(false); setTermLines([]); setTermInput("") } },
                        { bg: "#febc2e", fn: () => {
                          if (termMinimized) {
                            setTermMinimized(false)
                            setTimeout(() => inputRef.current?.focus(), 50)
                          } else {
                            setTermMinimizing(true)
                            setTimeout(() => { setTermMinimized(true); setTermMinimizing(false) }, 360)
                          }
                        }},
                        { bg: "#28c840", fn: () => { setTermMaximized(m => !m); setTermMinimized(false) } },
                      ].map((btn, i) => (
                        <div key={i}
                          onClick={(e) => { e.stopPropagation(); btn.fn() }}
                          style={{
                            width: Math.round(w * 0.025), height: Math.round(w * 0.025),
                            borderRadius: "50%", background: btn.bg, cursor: "pointer",
                            flexShrink: 0, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3)",
                          }}
                        />
                      ))}
                      <span style={{
                        position: "absolute", left: "50%", transform: "translateX(-50%)",
                        fontSize: Math.round(w * 0.02), color: "rgba(255,255,255,0.3)",
                        fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", fontWeight: 500,
                        pointerEvents: "none",
                      }}>terminal</span>
                    </div>

                    {/* Output area */}
                    {!termMinimized && (
                      <div
                        ref={termBodyRef}
                        style={{
                          padding: `${Math.round(w * 0.018)}px ${Math.round(w * 0.022)}px`,
                          minHeight: Math.round(w * 0.38),
                          maxHeight: termMaximized ? "100%" : Math.round(w * 0.58),
                          flex: termMaximized ? 1 : "none",
                          overflowY: "auto", scrollbarWidth: "none",
                        }}
                      >
                        {termLines.map((line, i) => (
                          <div key={i} style={{ color: line.color ?? "rgba(255,255,255,0.75)", paddingBottom: 1 }}>
                            {line.text}
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <span style={{ color: "#30d158", fontWeight: 600, flexShrink: 0 }}>➜ </span>
                          <span style={{ color: "#64d2ff", flexShrink: 0 }}>
                            {termCwd.split("/").map((seg, i, arr) => (
                              <span key={i}>
                                {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
                                <span style={{ color: i === arr.length - 1 ? "#a78bfa" : "#64d2ff" }}>{seg}</span>
                              </span>
                            ))}{" "}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>$ </span>
                          <input
                            ref={inputRef}
                            value={termInput}
                            onChange={(e) => setTermInput(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === "Enter") { runCommand(termInput, termCwd); return }
                              if (e.key === "Tab") {
                                e.preventDefault()
                                const val = termInput
                                if (val.startsWith("cd ")) {
                                  const partial = val.slice(3)
                                  const dirs = getDirs(termCwd, allProjectSlugs)
                                  const match = dirs.find(d => d.startsWith(partial) && d !== partial)
                                  if (match) setTermInput(`cd ${match}`)
                                } else {
                                  const match = COMMANDS.find(c => c.startsWith(val) && c !== val)
                                  if (match) setTermInput(match)
                                }
                              }
                            }}
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
                    )}
                  </div>
                </div>
              )}

              {/* Finder overlay */}
              {finderOpen && (() => {
                const fw = Math.round(w * 0.94)
                const fh = Math.round(h * 0.82)
                const sideW = Math.round(fw * 0.28)
                const fs = Math.round(w * 0.021)
                const finderBg   = isDark ? "rgba(30,30,32,0.98)"  : "rgba(236,236,238,0.98)"
                const sidebarBg  = isDark ? "rgba(22,22,24,0.98)"  : "rgba(220,220,224,0.98)"
                const titleBg    = isDark ? "rgba(40,40,42,0.98)"  : "rgba(230,230,232,0.98)"
                const borderCol  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)"
                const textPri    = isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.85)"
                const textSec    = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.38)"
                const selBg      = isDark ? "rgba(10,100,220,0.6)"  : "rgba(10,100,220,0.18)"
                const hoverBg    = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"

                const sidebar = [
                  { id: "favorites", label: "Favorites", type: "header" },
                  { id: "airdrop",   label: "AirDrop",   icon: "airdrop" },
                  { id: "recents",   label: "Recents",   icon: "recents" },
                  { id: "desktop",   label: "Desktop",   icon: "desktop" },
                  { id: "docs",      label: "Documents", icon: "docs" },
                  { id: "downloads", label: "Downloads", icon: "downloads" },
                  { id: "project",   label: "Project",   icon: "folder", active: true },
                  { id: "locations", label: "Locations", type: "header" },
                  { id: "macintosh", label: "Macintosh HD", icon: "hd" },
                ]

                const stackFolders = (tags ?? []).map((t, i) => ({ name: t, type: "folder", id: `tag-${i}` }))
                const featureFiles = (features ?? []).map((f, i) => ({ name: f.slice(0, 22) + (f.length > 22 ? "…" : ""), type: "file", id: `feat-${i}` }))
                const mainItems = [
                  { name: "src", type: "folder", id: "src" },
                  { name: "public", type: "folder", id: "public" },
                  { name: "package.json", type: "file", id: "pkg" },
                  { name: "README.md", type: "file", id: "readme" },
                  ...stackFolders,
                  ...featureFiles,
                ]

                const SideIcon = ({ id }: { id: string }) => {
                  const iconStyle: CSSProperties = { width: fs + 2, height: fs + 2, flexShrink: 0 }
                  if (id === "airdrop")   return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><path d="M4.93 4.93a10 10 0 1 1 14.14 14.14M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0" stroke="#5ac8fa" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="1.5" fill="#5ac8fa"/></svg>
                  if (id === "recents")   return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#ff9f0a" strokeWidth="1.5"/><path d="M12 7v5l3 3" stroke="#ff9f0a" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  if (id === "desktop")   return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#30d158" strokeWidth="1.5"/><path d="M8 21h8M12 17v4" stroke="#30d158" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  if (id === "docs")      return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#0a84ff" strokeWidth="1.5"/><polyline points="14 2 14 8 20 8" stroke="#0a84ff" strokeWidth="1.5"/></svg>
                  if (id === "downloads") return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><path d="M12 3v13M7 11l5 5 5-5" stroke="#5e5ce6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 20h18" stroke="#5e5ce6" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  if (id === "hd")        return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke={textSec as string} strokeWidth="1.5"/><path d="M16 14a2 2 0 1 0 0-1" stroke={textSec as string} strokeWidth="1.5" strokeLinecap="round"/><path d="M2 11h20" stroke={textSec as string} strokeWidth="1.5"/></svg>
                  // folder
                  return <svg style={iconStyle} viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#0a84ff" fillOpacity="0.85" stroke="#0a84ff" strokeWidth="0.5"/></svg>
                }

                const ItemIcon = ({ type, name }: { type: string; name: string }) => {
                  const sz = Math.round(w * 0.058)
                  if (type === "folder") return (
                    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#0a84ff" fillOpacity="0.9" stroke="#0a84ff" strokeWidth="0.3"/>
                    </svg>
                  )
                  const ext = name.split(".").pop()
                  const col = ext === "json" ? "#ff9f0a" : ext === "md" ? "#0a84ff" : "#8e8e93"
                  return (
                    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={col} fillOpacity="0.15" stroke={col} strokeWidth="1.2"/>
                      <polyline points="14 2 14 8 20 8" stroke={col} strokeWidth="1.2"/>
                      <text x="12" y="16" textAnchor="middle" fontSize="4.5" fill={col} fontFamily="monospace" fontWeight="700">{(ext ?? "").toUpperCase().slice(0,3)}</text>
                    </svg>
                  )
                }

                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", inset: 0, zIndex: 25,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
                      animation: "mbFade 0.12s ease",
                    }}
                  >
                    <div style={{
                      width: fw, height: fh,
                      borderRadius: 10,
                      overflow: "hidden",
                      display: "flex", flexDirection: "column",
                      boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.1)",
                      animation: "mbPaper 0.32s cubic-bezier(0.22,1,0.36,1)",
                      fontFamily: "-apple-system,'SF Pro Text',BlinkMacSystemFont,sans-serif",
                    }}>
                      {/* Title bar */}
                      <div style={{
                        height: Math.round(fh * 0.075), background: titleBg,
                        borderBottom: `0.5px solid ${borderCol}`,
                        display: "flex", alignItems: "center",
                        padding: `0 ${Math.round(fw * 0.018)}px`,
                        gap: Math.round(fw * 0.008), flexShrink: 0, position: "relative",
                      }}>
                        {[
                          { bg: "#ff5f57", fn: () => setFinderOpen(false) },
                          { bg: "#febc2e", fn: () => setFinderOpen(false) },
                          { bg: "#28c840", fn: () => {} },
                        ].map((btn, i) => (
                          <div key={i} onClick={(e) => { e.stopPropagation(); btn.fn() }} style={{
                            width: Math.round(fw * 0.028), height: Math.round(fw * 0.028),
                            borderRadius: "50%", background: btn.bg, cursor: "pointer", flexShrink: 0,
                            boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3)",
                          }} />
                        ))}
                        {/* Toolbar icons */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: Math.round(fw * 0.025) }}>
                          {/* Back/Forward */}
                          <div style={{ display: "flex", gap: 2 }}>
                            {["‹","›"].map((ch, i) => (
                              <div key={i} style={{ fontSize: Math.round(w * 0.032), color: textSec as string, cursor: "default", lineHeight: 1, paddingBottom: 1 }}>{ch}</div>
                            ))}
                          </div>
                          {/* Path breadcrumb */}
                          <div style={{ fontSize: Math.round(w * 0.022), color: textPri as string, fontWeight: 600, letterSpacing: -0.2 }}>
                            Project
                          </div>
                          {/* View icons */}
                          <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                            {[
                              <svg key="grid" width={fs} height={fs} viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" fill={textSec as string}/><rect x="9" y="1" width="6" height="6" rx="1" fill={textSec as string}/><rect x="1" y="9" width="6" height="6" rx="1" fill={textSec as string}/><rect x="9" y="9" width="6" height="6" rx="1" fill={textSec as string}/></svg>,
                              <svg key="list" width={fs} height={fs} viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="1.5" rx="0.75" fill={textSec as string}/><rect x="1" y="7" width="14" height="1.5" rx="0.75" fill={textSec as string}/><rect x="1" y="11" width="14" height="1.5" rx="0.75" fill={textSec as string}/></svg>,
                            ].map((icon, i) => (
                              <div key={i} style={{ padding: "2px 4px", borderRadius: 4, cursor: "pointer" }}>{icon}</div>
                            ))}
                          </div>
                          {/* Search */}
                          <div style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            borderRadius: 6, padding: `2px ${Math.round(fw * 0.02)}px`,
                            fontSize: Math.round(w * 0.02), color: textSec as string,
                          }}>
                            <svg width={fs - 2} height={fs - 2} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={textSec as string} strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke={textSec as string} strokeWidth="2" strokeLinecap="round"/></svg>
                            Search
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        {/* Sidebar */}
                        <div style={{
                          width: sideW, background: sidebarBg,
                          borderRight: `0.5px solid ${borderCol}`,
                          padding: `${Math.round(fh * 0.025)}px ${Math.round(sideW * 0.08)}px`,
                          overflowY: "auto", scrollbarWidth: "none", flexShrink: 0,
                        }}>
                          {sidebar.map(item => {
                            if (item.type === "header") return (
                              <div key={item.id} style={{
                                fontSize: Math.round(w * 0.018), fontWeight: 700,
                                color: textSec as string, letterSpacing: 0.6,
                                textTransform: "uppercase", padding: `${Math.round(fh * 0.022)}px 4px ${Math.round(fh * 0.008)}px`,
                              }}>{item.label}</div>
                            )
                            const isSel = finderSidebarSel === item.id
                            return (
                              <div key={item.id}
                                onClick={(e) => { e.stopPropagation(); setFinderSidebarSel(item.id!) }}
                                style={{
                                  display: "flex", alignItems: "center", gap: Math.round(sideW * 0.06),
                                  padding: `${Math.round(fh * 0.012)}px ${Math.round(sideW * 0.06)}px`,
                                  borderRadius: 6, cursor: "pointer",
                                  background: isSel ? selBg : "transparent",
                                  transition: "background 0.12s",
                                }}>
                                <SideIcon id={item.icon!} />
                                <span style={{ fontSize: fs, color: textPri as string, fontWeight: isSel ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Main area */}
                        <div style={{
                          flex: 1, background: finderBg,
                          padding: Math.round(fw * 0.03),
                          overflowY: "auto", scrollbarWidth: "none",
                          display: "flex", flexWrap: "wrap",
                          alignContent: "flex-start",
                          gap: Math.round(fw * 0.025),
                        }}>
                          {mainItems.map(item => {
                            const isSel = finderSel === item.id
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => { e.stopPropagation(); setFinderSel(item.id) }}
                                onDoubleClick={(e) => { e.stopPropagation() }}
                                style={{
                                  display: "flex", flexDirection: "column", alignItems: "center",
                                  gap: Math.round(fh * 0.012),
                                  padding: Math.round(fw * 0.018),
                                  borderRadius: 8, cursor: "pointer",
                                  background: isSel ? selBg : "transparent",
                                  transition: "background 0.1s",
                                  width: Math.round(fw * 0.14),
                                }}
                                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = hoverBg }}
                                onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                              >
                                <ItemIcon type={item.type} name={item.name} />
                                <span style={{
                                  fontSize: Math.round(w * 0.02),
                                  textAlign: "center", lineHeight: 1.3, wordBreak: "break-word",
                                  maxWidth: "100%", padding: isSel ? `1px ${Math.round(fw * 0.01)}px` : 0,
                                  background: isSel ? "#0a84ff" : "transparent",
                                  borderRadius: 3, color: isSel ? "#fff" : textPri as string,
                                }}>{item.name}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Status bar */}
                      <div style={{
                        height: Math.round(fh * 0.055), background: titleBg,
                        borderTop: `0.5px solid ${borderCol}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: Math.round(w * 0.019), color: textSec as string,
                        flexShrink: 0,
                      }}>
                        {mainItems.length} items
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Dock — show when multiple images OR description OR github exists */}
              {(hasDock || description || hasGithub) && (
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
                    {/* App icon — always first */}
                    <div
                      ref={(el) => { iconRefs.current[0] = el }}
                      onMouseEnter={() => setHoveredSlot("app")}
                      onMouseLeave={() => setHoveredSlot(null)}
                      onClick={(e) => { e.stopPropagation(); setFinderOpen(o => !o) }}
                      style={{
                        width: slotSize, height: slotSize, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "visible", position: "relative", cursor: "pointer",
                      }}
                    >
                      {/* macOS label */}
                      <div style={{
                        position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                        left: "50%", transform: "translateX(-50%)",
                        background: "rgba(24,24,26,0.88)",
                        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                        borderRadius: 6, padding: `${Math.round(w * 0.006)}px ${Math.round(w * 0.016)}px`,
                        fontSize: Math.round(w * 0.026), fontWeight: 500,
                        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                        color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                        pointerEvents: "none", zIndex: 100,
                        opacity: hoveredSlot === "app" ? 1 : 0,
                        transition: "opacity 0.12s ease",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
                      }}>Finder</div>
                      <div style={{
                        width: slotSize, height: slotSize,
                        transform: `scale(${scales[0] ?? 1})`,
                        transformOrigin: "bottom center",
                        willChange: "transform",
                        borderRadius: Math.round(slotSize * 0.22),
                        overflow: "hidden",
                        flexShrink: 0,
                      }}>
                        <img
                          src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775311266/finder-mac-removebg-preview_tuvtfs.png"
                          alt="app icon"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          draggable={false}
                        />
                      </div>
                    </div>

                    {/* Separator between app icon and thumbnails */}
                    {hasDock && <div style={{
                      width: 0.5, height: slotSize * 0.7, alignSelf: "center",
                      background: "rgba(255,255,255,0.2)", borderRadius: 1, flexShrink: 0,
                      marginLeft: 1, marginRight: 1,
                    }} />}

                    {/* Projects mode: one icon per project */}
                    {hasDock && projects && projects.map((p, idx) => {
                      const scale = scales[idx + 1] ?? 1
                      const isActive = idx === activeProject
                      const thumb = p.images?.[0]
                      const slotKey = `proj-${idx}`
                      return (
                        <div
                          key={idx}
                          ref={(el) => { iconRefs.current[idx + 1] = el }}
                          onMouseEnter={() => setHoveredSlot(slotKey)}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{
                            width: slotSize, height: slotSize, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "flex-end",
                            cursor: "pointer", overflow: "visible", position: "relative",
                          }}
                          onClick={(e) => { e.stopPropagation(); setActiveProject(idx) }}
                        >
                          {/* label */}
                          <div style={{
                            position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                            left: "50%", transform: "translateX(-50%)",
                            background: "rgba(24,24,26,0.88)",
                            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            borderRadius: 6, padding: `${Math.round(w * 0.006)}px ${Math.round(w * 0.016)}px`,
                            fontSize: Math.round(w * 0.024), fontWeight: 500,
                            fontFamily: "-apple-system,'SF Pro Text',BlinkMacSystemFont,sans-serif",
                            color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                            pointerEvents: "none", zIndex: 100,
                            opacity: hoveredSlot === slotKey ? 1 : 0,
                            transition: "opacity 0.12s ease",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
                          }}>{p.title ?? `Project ${idx + 1}`}</div>
                          <div style={{
                            width: slotSize, height: slotSize,
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
                            background: "#1a1a1c",
                          }}>
                            {thumb
                              ? <img src={thumb} alt={p.title ?? `project ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
                              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1c1c1e,#2c2c2e)" }} />
                            }
                          </div>
                          <div style={{
                            position: "absolute", bottom: -(DOCK_PAD_Y + 1), left: "50%",
                            transform: "translateX(-50%)", width: 2.5, height: 2.5,
                            borderRadius: "50%",
                            background: isActive ? "rgba(255,255,255,0.9)" : "transparent",
                            transition: "background 0.2s", pointerEvents: "none",
                          }} />
                        </div>
                      )
                    })}

                    {/* Images mode: one icon per image in current project */}
                    {hasDock && !projects && imgList.map((imgSrc, idx) => {
                      const scale = scales[idx + 1] ?? 1
                      const isActive = idx === activeImg
                      return (
                        <div
                          key={idx}
                          ref={(el) => { iconRefs.current[idx + 1] = el }}
                          style={{
                            width: slotSize, height: slotSize, flexShrink: 0,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "flex-end",
                            cursor: "pointer", overflow: "visible", position: "relative",
                          }}
                          onClick={(e) => { e.stopPropagation(); setActiveImg(idx) }}
                        >
                          <div style={{
                            width: slotSize, height: slotSize,
                            transform: `scale(${scale})`,
                            transformOrigin: "bottom center",
                            willChange: "transform",
                            borderRadius: Math.round(slotSize * 0.22),
                            overflow: "hidden",
                            boxShadow: isActive
                              ? "0 0 0 1.5px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.5)"
                              : "0 1px 5px rgba(0,0,0,0.5)",
                            transition: "box-shadow 0.2s", flexShrink: 0,
                          }}>
                            <img src={imgSrc} alt={`view ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
                          </div>
                          <div style={{
                            position: "absolute", bottom: -(DOCK_PAD_Y + 1), left: "50%",
                            transform: "translateX(-50%)", width: 2.5, height: 2.5,
                            borderRadius: "50%",
                            background: isActive ? "rgba(255,255,255,0.9)" : "transparent",
                            transition: "background 0.2s", pointerEvents: "none",
                          }} />
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
                        ref={(el) => { iconRefs.current[dockCount + 1] = el }}
                        onMouseEnter={() => setHoveredSlot("terminal")}
                        onMouseLeave={() => setHoveredSlot(null)}
                        style={{
                          width: slotSize, height: slotSize, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", overflow: "visible", position: "relative",
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (termMinimized) {
                            setTermMinimized(false)
                            setTimeout(() => inputRef.current?.focus(), 50)
                          } else {
                            setTermOrigin(getOrigin(e))
                            setTerminalOpen(o => !o)
                          }
                        }}
                      >
                        {/* macOS label */}
                        <div style={{
                          position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                          left: "50%", transform: "translateX(-50%)",
                          background: "rgba(24,24,26,0.88)",
                          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                          borderRadius: 6, padding: `${Math.round(w * 0.006)}px ${Math.round(w * 0.016)}px`,
                          fontSize: Math.round(w * 0.026), fontWeight: 500,
                          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                          color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 100,
                          opacity: hoveredSlot === "terminal" ? 1 : 0,
                          transition: "opacity 0.12s ease",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
                          display: "flex", alignItems: "center", gap: Math.round(w * 0.01),
                        }}>
                          Terminal
                          <span style={{
                            fontSize: Math.round(w * 0.022), color: "rgba(255,255,255,0.45)",
                            fontWeight: 400,
                          }}>⌘↩</span>
                        </div>
                        <div style={{
                          width: slotSize, height: slotSize,
                          transform: `scale(${scales[dockCount + 1] ?? 1})`,
                          transformOrigin: "bottom center",
                          willChange: "transform",
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
                          animation: termMinimized ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined,
                        }}>
                          <svg width={slotSize * 0.5} height={slotSize * 0.5} viewBox="0 0 24 24" fill="none">
                            <polyline points="4 17 10 11 4 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="19" x2="20" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    </>}

                    {/* GitHub icon */}
                    {hasGithub && <>
                      {!description && (
                        <div style={{
                          width: 0.5, height: slotSize * 0.7, alignSelf: "center",
                          background: "rgba(255,255,255,0.2)", borderRadius: 1, flexShrink: 0,
                          marginLeft: 1, marginRight: 1,
                        }} />
                      )}
                      <div
                        ref={(el) => { iconRefs.current[dockCount + 1 + (description ? 1 : 0)] = el }}
                        onMouseEnter={() => setHoveredSlot("github")}
                        onMouseLeave={() => setHoveredSlot(null)}
                        style={{
                          width: slotSize, height: slotSize, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", overflow: "visible", position: "relative",
                        }}
                        onClick={(e) => { e.stopPropagation(); window.open(githubUrl, "_blank", "noopener,noreferrer") }}
                      >
                        {/* macOS label */}
                        <div style={{
                          position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                          left: "50%", transform: "translateX(-50%)",
                          background: "rgba(24,24,26,0.88)",
                          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                          borderRadius: 6, padding: `${Math.round(w * 0.006)}px ${Math.round(w * 0.016)}px`,
                          fontSize: Math.round(w * 0.026), fontWeight: 500,
                          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                          color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 100,
                          opacity: hoveredSlot === "github" ? 1 : 0,
                          transition: "opacity 0.12s ease",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
                        }}>GitHub</div>
                        <div style={{
                          width: slotSize, height: slotSize,
                          transform: `scale(${scales[dockCount + 1 + (description ? 1 : 0)] ?? 1})`,
                          transformOrigin: "bottom center",
                          willChange: "transform",
                          borderRadius: Math.round(slotSize * 0.22),
                          background: "linear-gradient(145deg,#24292e,#1a1f24)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 1px 5px rgba(0,0,0,0.6)",
                          flexShrink: 0,
                        }}>
                          <svg width={slotSize * 0.56} height={slotSize * 0.56} viewBox="0 0 24 24" fill="white">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                          </svg>
                        </div>
                      </div>
                    </>}
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

      <style>{`
        @keyframes mbFade {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes qlIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes qlSlide {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes mbPaper {
          0%   { transform: scale(0.08); opacity: 0;   }
          55%  { transform: scale(1.03); opacity: 1;   }
          100% { transform: scale(1);    opacity: 1;   }
        }
        @keyframes mbImg {
          0%   { opacity: 0; transform: scale(1.06) translateY(8px); }
          100% { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes mbMinimize {
          0%   { transform: scale(1)    translateY(0);    opacity: 1; }
          60%  { transform: scale(0.55) translateY(30px); opacity: 0.8; }
          100% { transform: scale(0.05) translateY(80px); opacity: 0; }
        }
        @keyframes mbDockBounce {
          0%,100% { transform: scale(1) translateY(0); }
          40%     { transform: scale(1) translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
