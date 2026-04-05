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
  icon?: string
  iconDark?: string
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

interface WinState {
  id: number
  projectIdx: number
  pos: { x: number; y: number }
  maximized: boolean
  minimized: boolean
  minimizing: boolean
  hoveredTl: number
  activeImg: number
}

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

  const [openWindows, setOpenWindows] = useState<WinState[]>([])
  const [focusedWinId, setFocusedWinId] = useState<number | null>(null)
  const winIdRef = useRef(0)
  const winDragRef = useRef<{ winId: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const openWindowsRef = useRef<WinState[]>([])
  const [quickLookOpen, setQuickLookOpen] = useState(false)
  const [quickLookIdx, setQuickLookIdx] = useState(0)
  const [quickLookMax, setQuickLookMax] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [clock, setClock] = useState("")
  const [showNotif, setShowNotif] = useState(false)
  const [notifBig, setNotifBig] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [closingSrc, setClosingSrc] = useState<string | null>(null)
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
  const arrowResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetScales = useRef<number[]>([])
  const currentScales = useRef<number[]>([])
  const { theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  // Keep openWindowsRef in sync for use in callbacks without stale closures
  openWindowsRef.current = openWindows

  // Derive focused window / active project (for terminal, finder, etc.)
  const focusedWin = openWindows.find(w => w.id === focusedWinId) ?? null
  const activeProject = focusedWin?.projectIdx ?? null
  const proj = activeProject !== null ? projects?.[activeProject] : undefined
  const images = proj?.images ?? imagesProp
  const description = proj?.description ?? descProp
  const githubUrl = proj?.githubUrl ?? githubProp
  const liveUrl = proj?.liveUrl ?? liveProp
  const tags = proj?.tags ?? tagsProp
  const features = proj?.features ?? featuresProp

  const imgList: string[] = images && images.length > 0 ? images : src ? [src] : []
  // In projects mode, dock icons = one per project; otherwise = one per image
  const dockCount = projects ? projects.length : imgList.length
  const hasDock = dockCount > 1
  const hasGithub = !!githubUrl && githubUrl !== "#"
  const showTerminalIcon = !!(description || projects)
  const showGithubIcon   = !!(hasGithub || projects)

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
  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      const d = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      const t = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      setClock(`${d}  ${t}`)
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  // ── multi-window helpers ───────────────────────────────────────────────────
  const updateWin = useCallback((id: number, patch: Partial<WinState>) => {
    setOpenWindows(ws => ws.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const focusWin = useCallback((id: number) => {
    setOpenWindows(ws => {
      const win = ws.find(w => w.id === id)
      if (!win) return ws
      return [...ws.filter(w => w.id !== id), win]
    })
    setFocusedWinId(id)
  }, [])

  const closeWindow = useCallback((id: number) => {
    const ws = openWindowsRef.current
    const win = ws.find(w => w.id === id)
    if (win) {
      const p = projects?.[win.projectIdx]
      const csrc = p?.images?.[win.activeImg] ?? null
      if (csrc) { setClosingSrc(csrc); setTimeout(() => setClosingSrc(null), 400) }
    }
    setOpenWindows(prev => prev.filter(w => w.id !== id))
    setFocusedWinId(prev => {
      if (prev !== id) return prev
      const remaining = openWindowsRef.current.filter(w => w.id !== id)
      return remaining.length > 0 ? remaining[remaining.length - 1].id : null
    })
  }, [projects])

  const openWindow = useCallback((projectIdx: number) => {
    const existing = openWindowsRef.current.find(w => w.projectIdx === projectIdx)
    if (existing) {
      if (existing.minimized) {
        setOpenWindows(ws => ws.map(w => w.id === existing.id ? { ...w, minimized: false, minimizing: false } : w))
      }
      setOpenWindows(ws => {
        const win = ws.find(w => w.id === existing.id)
        if (!win) return ws
        return [...ws.filter(w => w.id !== existing.id), win]
      })
      setFocusedWinId(existing.id)
      return
    }
    const id = ++winIdRef.current
    const cascadeN = openWindowsRef.current.filter(w => !w.minimized).length
    setOpenWindows(ws => [...ws, {
      id, projectIdx,
      pos: { x: cascadeN * 24, y: cascadeN * 24 },
      maximized: false, minimized: false, minimizing: false,
      hoveredTl: -1, activeImg: 0,
    }])
    setFocusedWinId(id)
  }, [])

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
          if (idx >= 0) openWindow(idx)
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
  }, [description, tags, features, githubUrl, liveUrl, projectSlug, isDark, allProjectSlugs, openWindow])

  // Auto-focus input + show welcome hint when terminal opens
  useEffect(() => {
    if (terminalOpen) {
      const cwd = proj ? `~/projects/${projectSlug}` : "~"
      setTermCwd(cwd)
      setTermLines([
        { text: "Type  help  to see available commands.", color: "#ffd60a" },
        { text: "Tip   ⇥ Tab  to autocomplete commands & paths.", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" },
        ...(!proj ? [{ text: "Tip   cd projects  to browse projects.", color: "#0a84ff" }] : []),
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
    const totalSlots = 1 + dockCount + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0)
    const ones = Array(totalSlots).fill(1)
    targetScales.current = [...ones]
    currentScales.current = [...ones]
    setScales(ones)
  }, [dockCount, showTerminalIcon, showGithubIcon])

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
    ...(showTerminalIcon ? [{ type: "terminal" as const, refIdx: dockCount + 1 }] : []),
    ...(showGithubIcon   ? [{ type: "github"   as const, refIdx: dockCount + 1 + (showTerminalIcon ? 1 : 0) }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projects?.length, imgList.length, dockCount, showTerminalIcon, showGithubIcon])

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
        setQuickLookMax(false)
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
        if (arrowResetRef.current) clearTimeout(arrowResetRef.current)
        arrowResetRef.current = setTimeout(resetTargets, 700)
      }
      if ((!terminalOpen || termMinimized) && e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        const item = dockItems[focusedDockIdxRef.current]
        if (!item) return
        if (item.type === "finder") { setFinderOpen(o => !o) }
        if (item.type === "project") {
          openWindow(item.projIdx)
        }
        if (item.type === "terminal") {
          if (termMinimized) { setTermMinimized(false); setTimeout(() => inputRef.current?.focus(), 50) }
          else setTerminalOpen(true)
        }
        if (item.type === "github") {
          if (projects && openWindows.length === 0) {
            setTermOrigin("50% 80%"); setTerminalOpen(true)
            setTimeout(() => setTermLines(l => [...l, { text: "  Select a project first.", color: "#ff453a" }]), 120)
          } else if (githubUrl && githubUrl !== "#") {
            window.open(githubUrl, "_blank", "noopener,noreferrer")
          }
        }
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
      borderTop: isDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
      borderLeft: isDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
      borderRight: isDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
      borderBottom: "none",
      position: "relative",
      overflow: "hidden",
    },
    bezel: {
      position: "absolute",
      top: 5, left: 5, right: 5, bottom: 5,
      background: "#050507",
      borderRadius: "6px 6px 0 0",
      overflow: "hidden",
    },
    notch: {
      position: "absolute",
      top: 0, left: "50%",
      transform: "translateX(-50%)",
      width: Math.round(w * 0.165),
      height: Math.round(h * 0.048),
      background: "#000",
      borderRadius: `0 0 ${Math.round(w * 0.012)}px ${Math.round(w * 0.012)}px`,
      zIndex: 10,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
    },
    cam:    { width: Math.round(w * 0.009), height: Math.round(w * 0.009), borderRadius: "50%", background: "#2a2a2a", border: `0.5px solid #333`, flexShrink: 0 },
    micDot: { width: 0, height: 0 },
    notifPill: (() => {
      const fullW  = Math.round(w * 0.46)
      const fullH  = Math.round(h * 0.21)
      const notchW = Math.round(w * 0.165)
      const notchH = Math.round(h * 0.048)
      const sx = notifBig ? 1 : notchW / fullW
      const sy = notifBig ? 1 : notchH / fullH
      return {
        position: "absolute" as const,
        top: 0, left: "50%",
        width: fullW, height: fullH,
        background: "rgba(18,18,20,0.96)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderRadius: `0 0 ${Math.round(w * 0.022)}px ${Math.round(w * 0.022)}px`,
        borderLeft: "0.5px solid rgba(255,255,255,0.08)",
        borderRight: "0.5px solid rgba(255,255,255,0.08)",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        borderTop: "none",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        overflow: "hidden",
        zIndex: 12,
        pointerEvents: "none" as const,
        opacity: showNotif ? 1 : 0,
        transformOrigin: "top center",
        transform: `translateX(-50%) scaleX(${sx}) scaleY(${sy})`,
        transition: [
          "transform 0.52s cubic-bezier(0.32,0.72,0,1)",
          "opacity 0.25s ease",
        ].join(", "),
      }
    })(),
    notifContent: {
      display: "flex", flexDirection: "column" as const,
      opacity: notifBig ? 1 : 0,
      transition: notifBig ? "opacity 0.22s ease 0.28s" : "opacity 0.08s ease",
    },
    screen: {
      position: "absolute",
      top: 4,
      left: 5,
      right: 5,
      bottom: 4,
      borderRadius: 3,
      overflow: "hidden",
      background: `url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775348567/wp8030357_ctm5ix.jpg") center/cover no-repeat`,
      zIndex: 1,
    },
    screenOff: {
      position: "absolute", inset: 0,
      background: "#000",
      zIndex: 5,
      borderRadius: "inherit",
      opacity: hovered ? 0 : 1,
      pointerEvents: hovered ? "none" : "auto",
      transition: "opacity 0.6s ease",
    },
    screenOn: {
      position: "absolute", inset: 0,
      zIndex: 2,
      borderRadius: "inherit",
      overflow: "hidden",
      opacity: hovered ? 1 : 0,
      transition: "opacity 0.6s ease",
    },
    hingeBump: {
      position: "absolute", top: 0, left: "50%",
      transform: "translateX(-50%)",
      width: 80, height: 5,
      background: isDark
        ? "linear-gradient(180deg,#4a4a4e 0%,#3a3a3c 100%)"
        : "linear-gradient(180deg,#c0c0c2 0%,#b0b0b2 100%)",
      borderRadius: "0 0 6px 6px",
      borderLeft: isDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderRight: isDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderBottom: isDark ? "1px solid #555558" : "1px solid #a0a0a2",
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
      borderLeft: isDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderRight: isDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderBottom: isDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderTop: isDark ? "1.5px solid #3a3a3c" : "1.5px solid #e8e8ea",
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
            <div style={s.cam} />
          </div>

          {/* macOS notification */}
          <div style={s.notifPill}>
            <div style={s.notifContent}>
              {/* App header row */}
              <div style={{
                display: "flex", alignItems: "center", gap: Math.round(w * 0.01),
                padding: `${Math.round(h * 0.022)}px ${Math.round(w * 0.022)}px ${Math.round(h * 0.008)}px`,
                borderBottom: "0.5px solid rgba(255,255,255,0.07)",
              }}>
                <div style={{
                  width: Math.round(w * 0.028), height: Math.round(w * 0.028),
                  borderRadius: Math.round(w * 0.006), flexShrink: 0,
                  background: "linear-gradient(145deg,#34c759,#30b350)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width={Math.round(w * 0.016)} height={Math.round(w * 0.016)} viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                  </svg>
                </div>
                <span style={{
                  fontSize: Math.round(w * 0.018), fontWeight: 500,
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                  letterSpacing: 0.1, flex: 1,
                }}>Messages</span>
                <span style={{
                  fontSize: Math.round(w * 0.016), color: "rgba(255,255,255,0.3)",
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                }}>now</span>
              </div>
              {/* Message body */}
              <div style={{
                padding: `${Math.round(h * 0.016)}px ${Math.round(w * 0.022)}px ${Math.round(h * 0.022)}px`,
                display: "flex", flexDirection: "column", gap: Math.round(h * 0.006),
              }}>
                <span style={{
                  fontSize: Math.round(w * 0.02), fontWeight: 600,
                  color: "rgba(255,255,255,0.9)", lineHeight: 1.2,
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                }}>Zakaria</span>
                <span style={{
                  fontSize: Math.round(w * 0.019), fontWeight: 400,
                  color: "rgba(255,255,255,0.6)", lineHeight: 1.3,
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                }}>Let&apos;s build something great 🤝</span>
              </div>
            </div>
          </div>

          <div ref={screenRef} style={s.screen} onMouseEnter={resetTargets}>
            <div style={s.screenOff} />
            <div style={s.screenOn}>

              {/* macOS menu bar */}
              {hovered && (() => {
                const mbH = Math.round(h * 0.036)
                const fs  = Math.round(w * 0.0155)
                return (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: mbH,
                    background: "rgba(12,12,14,0.72)",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: `0 ${Math.round(w * 0.015)}px`,
                    zIndex: 15, pointerEvents: "none",
                    fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
                    fontSize: fs,
                  }}>
                    {/* Left: logo + app name */}
                    <div style={{ display: "flex", alignItems: "center", gap: Math.round(w * 0.012) }}>
                      <img
                        src="/moon-purple.png"
                        alt="logo"
                        style={{ height: Math.round(mbH * 0.62), width: "auto", display: "block" }}
                      />
                      <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.88)", fontSize: Math.round(w * 0.013), fontFamily: "'Playwrite IE', cursive", letterSpacing: "0.02em" }}>{proj?.title ?? "Zakaria"}</span>
                    </div>
                    {/* Right: clock */}
                    <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 400, letterSpacing: 0.1, fontSize: Math.round(w * 0.013) }}>{clock}</span>
                  </div>
                )
              })()}

              {/* App Windows — one per open project */}
              {(() => {
                const mbH    = Math.round(h * 0.036)
                const availH = h - mbH
                const baseWinW   = Math.round(w * 0.88)
                const baseWinH   = Math.round(availH * 0.80)
                const baseWinTop = mbH + Math.round((availH - baseWinH) * 0.22)
                const baseWinLeft= Math.round((w - baseWinW) / 2)
                const titleH = 22
                const toolH  = 28
                const iconSz = Math.round(toolH * 0.52)
                const slugMap: Record<string,string> = {
                  react:"react/react-original", typescript:"typescript/typescript-original",
                  ts:"typescript/typescript-original", javascript:"javascript/javascript-original",
                  js:"javascript/javascript-original", "node.js":"nodejs/nodejs-original",
                  nodejs:"nodejs/nodejs-original", node:"nodejs/nodejs-original",
                  "next.js":"nextjs/nextjs-original", nextjs:"nextjs/nextjs-original",
                  next:"nextjs/nextjs-original", vue:"vuejs/vuejs-original",
                  python:"python/python-original", mongodb:"mongodb/mongodb-original",
                  postgresql:"postgresql/postgresql-original", postgres:"postgresql/postgresql-original",
                  docker:"docker/docker-original", git:"git/git-original",
                  css:"css3/css3-original", html:"html5/html5-original",
                  tailwind:"tailwindcss/tailwindcss-plain", tailwindcss:"tailwindcss/tailwindcss-plain",
                  firebase:"firebase/firebase-plain", figma:"figma/figma-original",
                  graphql:"graphql/graphql-plain", redux:"redux/redux-original",
                  vite:"vite/vite-original", express:"express/express-original",
                  rust:"rust/rust-plain", go:"go/go-original", java:"java/java-original",
                  swift:"swift/swift-original", supabase:"supabase/supabase-original",
                  prisma:"prisma/prisma-original", aws:"amazonwebservices/amazonwebservices-plain",
                  vercel:"vercel/vercel-original",
                }
                const deviconUrl = (tag: string) => {
                  const slug = slugMap[tag.toLowerCase()]
                  return slug ? `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}.svg` : null
                }
                return openWindows.filter(win => !win.minimized).map((win, winIndex) => {
                  const p = projects?.[win.projectIdx]
                  if (!p) return null
                  const pTags    = p.tags ?? tagsProp ?? []
                  const pImgList = p.images && p.images.length > 0 ? p.images : src ? [src] : []
                  const pCurSrc  = pImgList[win.activeImg] ?? null
                  const pGitUrl  = p.githubUrl ?? githubProp
                  const pLiveUrl = p.liveUrl   ?? liveProp
                  const pHasGit  = !!pGitUrl && pGitUrl !== "#"
                  const isFocused = win.id === focusedWinId
                  const zIdx = 3 + winIndex
                  const winW   = baseWinW
                  const winH   = baseWinH
                  const winTop  = baseWinTop  + win.pos.y
                  const winLeft = baseWinLeft + win.pos.x
                  const btnSz  = Math.round(winW * 0.046)
                  const tlSz   = Math.round(titleH * 0.54)
                  const tlGap  = Math.round(titleH * 0.45)
                  const tlLeft = Math.round(titleH * 0.64)
                  const tl = [
                    { fill: "#ed6a5f", border: "#e24b41", sym: "×", symClr: "#460804",
                      fn: () => closeWindow(win.id) },
                    { fill: "#f6be50", border: "#e1a73e", sym: "−", symClr: "#90591d",
                      fn: () => { updateWin(win.id, { minimizing: true }); setTimeout(() => updateWin(win.id, { minimized: true, minimizing: false }), 340) } },
                    { fill: "#61c555", border: "#2dac2f", sym: "⤢", symClr: "#2a6218",
                      fn: () => updateWin(win.id, { maximized: !win.maximized }) },
                  ]
                  const winBg   = isDark ? "#1c1c1e" : "#f4f4f6"
                  const divClr  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
                  const textSec = isDark ? "rgba(255,255,255,0.5)"  : "rgba(0,0,0,0.45)"
                  return (
                  <div
                    key={win.id}
                    onClick={e => { e.stopPropagation(); focusWin(win.id) }}
                    style={{
                      position: "absolute",
                      ...(win.maximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : { top: winTop, left: winLeft, width: winW, height: winH }
                      ),
                      borderRadius: win.maximized ? 0 : 10,
                      background: winBg,
                      border: `0.5px solid ${isFocused ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)") : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)")}`,
                      boxShadow: isFocused
                        ? (isDark
                          ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.4), 0 12px 36px rgba(0,0,0,0.55), 0 32px 80px rgba(0,0,0,0.6)"
                          : "0 0 0 0.5px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.07), 0 12px 36px rgba(0,0,0,0.12), 0 32px 80px rgba(0,0,0,0.16)")
                        : "0 2px 12px rgba(0,0,0,0.2)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden", zIndex: zIdx,
                      transition: win.minimizing || winDragRef.current?.winId === win.id ? "none"
                        : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
                      animation: win.minimizing
                        ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                        : "winIn 0.36s cubic-bezier(0.22,1,0.36,1)",
                      transformOrigin: "50% 100%",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        if (win.maximized) return
                        e.preventDefault()
                        focusWin(win.id)
                        winDragRef.current = { winId: win.id, startX: e.clientX, startY: e.clientY, ox: win.pos.x, oy: win.pos.y }
                        const onMove = (ev: MouseEvent) => {
                          const drag = winDragRef.current
                          if (!drag) return
                          const dx = ev.clientX - drag.startX
                          const dy = ev.clientY - drag.startY
                          setOpenWindows(ws => ws.map(w => w.id === drag.winId
                            ? { ...w, pos: { x: drag.ox + dx, y: drag.oy + dy } }
                            : w
                          ))
                        }
                        const onUp = () => {
                          winDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{
                        height: titleH, flexShrink: 0,
                        background: isDark ? "#2c2c2e" : "#ececec",
                        borderBottom: `0.5px solid ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"}`,
                        display: "flex", alignItems: "center",
                        position: "relative", userSelect: "none",
                        cursor: win.maximized ? "default" : "grab",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap, paddingLeft: tlLeft, zIndex: 1 }}>
                        {tl.map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); btn.fn() }}
                            onMouseEnter={() => updateWin(win.id, { hoveredTl: i })}
                            onMouseLeave={() => updateWin(win.id, { hoveredTl: -1 })}
                            style={{
                              width: tlSz, height: tlSz, borderRadius: "50%",
                              background: btn.fill, border: `0.5px solid ${btn.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", flexShrink: 0,
                            }}
                          >
                            <span style={{
                              fontSize: Math.round(tlSz * 0.58), lineHeight: 1, fontWeight: 900,
                              color: btn.symClr, opacity: win.hoveredTl === i ? 1 : 0,
                              transition: "opacity 0.08s", userSelect: "none",
                            }}>{btn.sym}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none",
                      }}>
                        <span style={{
                          fontSize: Math.round(w * 0.026), fontWeight: 500,
                          color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.58)",
                          letterSpacing: -0.1,
                          fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
                        }}>{p.title}</span>
                      </div>
                    </div>

                    {/* Toolbar — stack icons + live + github */}
                    <div style={{
                      height: toolH, flexShrink: 0,
                      background: isDark ? "#242426" : "#f5f5f5",
                      borderBottom: `0.5px solid ${divClr}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: `0 ${Math.round(winW * 0.025)}px`,
                      userSelect: "none",
                    }}>
                      {/* Stack icons */}
                      <div style={{ display: "flex", alignItems: "center", gap: Math.round(winW * 0.012) }}>
                        {pTags.slice(0, 7).map((tag, i) => {
                          const url = deviconUrl(tag)
                          return (
                            <div key={i} title={tag} style={{
                              width: iconSz, height: iconSz, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              opacity: 0.85,
                            }}>
                              {url ? (
                                <img src={url} alt={tag} draggable={false}
                                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                                />
                              ) : (
                                <span style={{
                                  fontSize: Math.round(iconSz * 0.42), fontWeight: 700,
                                  color: textSec, fontFamily: "'SF Mono',monospace",
                                }}>{tag.slice(0,2).toUpperCase()}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {/* Actions: Live + GitHub */}
                      <div style={{ display: "flex", alignItems: "center", gap: Math.round(winW * 0.018) }}>
                        {pLiveUrl && pLiveUrl !== "#" && (
                          <div
                            onClick={e => { e.stopPropagation(); window.open(pLiveUrl, "_blank", "noopener,noreferrer") }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                            style={{
                              display: "flex", alignItems: "center", gap: Math.round(winW * 0.012),
                              padding: `2px ${Math.round(winW * 0.018)}px`,
                              borderRadius: 5, cursor: "pointer", transition: "background 0.12s",
                              background: "transparent",
                            }}
                          >
                            <svg width={Math.round(iconSz * 0.88)} height={Math.round(iconSz * 0.88)} viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="9" stroke={isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"} strokeWidth="1.5"/>
                              <path d="M12 3c-2.4 2.8-3 5.5-3 9s.6 6.2 3 9M12 3c2.4 2.8 3 5.5 3 9s-.6 6.2-3 9M3 12h18" stroke={isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"} strokeWidth="1.5"/>
                            </svg>
                            <span style={{
                              fontSize: Math.round(w * 0.024), fontWeight: 500,
                              color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
                              fontFamily: "-apple-system,'SF Pro Text',sans-serif",
                            }}>Live</span>
                          </div>
                        )}
                        {pHasGit && (
                          <div
                            onClick={e => { e.stopPropagation(); window.open(pGitUrl, "_blank", "noopener,noreferrer") }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                            style={{
                              display: "flex", alignItems: "center", gap: Math.round(winW * 0.012),
                              padding: `2px ${Math.round(winW * 0.018)}px`,
                              borderRadius: 5, cursor: "pointer", transition: "background 0.12s",
                              background: "transparent",
                            }}
                          >
                            <svg width={Math.round(iconSz * 0.88)} height={Math.round(iconSz * 0.88)} viewBox="0 0 24 24" fill={isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"}>
                              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                            <span style={{
                              fontSize: Math.round(w * 0.024), fontWeight: 500,
                              color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
                              fontFamily: "-apple-system,'SF Pro Text',sans-serif",
                            }}>GitHub</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Screenshot — full content */}
                    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#050507" }}>
                      {pImgList.length > 0 && pCurSrc ? (
                        <img key={win.activeImg} src={pCurSrc} alt="screen"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                            animation: "mbImg 0.28s cubic-bezier(0.16,1,0.3,1)" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: Math.round(w * 0.02), color: "rgba(255,255,255,0.1)", fontFamily: "-apple-system,sans-serif" }}>No preview</span>
                        </div>
                      )}

                      {/* Prev arrow */}
                      {pImgList.length > 1 && (
                        <div onClick={e => { e.stopPropagation(); updateWin(win.id, { activeImg: Math.max(0, win.activeImg - 1) }) }}
                          style={{
                            position: "absolute", left: Math.round(winW * 0.022), top: "50%", transform: "translateY(-50%)",
                            width: btnSz, height: btnSz, borderRadius: "50%",
                            background: "rgba(0,0,0,0.46)", backdropFilter: "blur(12px)",
                            border: "0.5px solid rgba(255,255,255,0.13)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: win.activeImg === 0 ? "default" : "pointer",
                            opacity: win.activeImg === 0 ? 0.2 : 1, transition: "opacity 0.15s",
                            pointerEvents: win.activeImg === 0 ? "none" : "auto", zIndex: 2,
                          }}>
                          <svg width={btnSz * 0.4} height={btnSz * 0.4} viewBox="0 0 24 24" fill="none">
                            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}

                      {/* Next arrow */}
                      {pImgList.length > 1 && (
                        <div onClick={e => { e.stopPropagation(); updateWin(win.id, { activeImg: Math.min(pImgList.length - 1, win.activeImg + 1) }) }}
                          style={{
                            position: "absolute", right: Math.round(winW * 0.022), top: "50%", transform: "translateY(-50%)",
                            width: btnSz, height: btnSz, borderRadius: "50%",
                            background: "rgba(0,0,0,0.46)", backdropFilter: "blur(12px)",
                            border: "0.5px solid rgba(255,255,255,0.13)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: win.activeImg === pImgList.length - 1 ? "default" : "pointer",
                            opacity: win.activeImg === pImgList.length - 1 ? 0.2 : 1, transition: "opacity 0.15s",
                            pointerEvents: win.activeImg === pImgList.length - 1 ? "none" : "auto", zIndex: 2,
                          }}>
                          <svg width={btnSz * 0.4} height={btnSz * 0.4} viewBox="0 0 24 24" fill="none">
                            <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}

                    </div>
                  </div>
                  )
                })
              })()}
              {/* Closing animation — exit layer over wallpaper */}
              {closingSrc && (
                <img
                  key={`close-${closingSrc}`}
                  src={closingSrc}
                  alt=""
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                    animation: "mbImgClose 0.38s cubic-bezier(0.4,0,0.6,1) forwards",
                    zIndex: 6, pointerEvents: "none",
                  }}
                />
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
                      {/* Traffic lights */}
                      <div style={{ display: "flex", gap: Math.round(w * 0.007), flexShrink: 0 }}>
                        {[
                          { c: "#ff5f57", fn: () => { setQuickLookOpen(false); setQuickLookMax(false) } },
                          { c: "#febc2e", fn: () => { setQuickLookOpen(false); setQuickLookMax(false) } },
                          { c: "#28c840", fn: () => setQuickLookMax(m => !m) },
                        ].map((btn, i) => (
                          <div key={i} onClick={(e) => { e.stopPropagation(); btn.fn() }} style={{
                            width: Math.round(w * 0.024), height: Math.round(w * 0.024),
                            borderRadius: "50%", background: btn.c, cursor: "pointer",
                            boxShadow: "0 0 0 0.5px rgba(0,0,0,0.4)",
                          }} />
                        ))}
                      </div>
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
                      <div style={{ width: Math.round(w * 0.08), flexShrink: 0 }} />
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
                    {!quickLookMax && <div
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
                    </div>}
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
                    background: isDark ? "rgba(18,18,20,0.97)" : "rgba(255,255,255,0.97)",
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
                      fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
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
              {(hasDock || showTerminalIcon || showGithubIcon) && (
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
                    onMouseMove={(e) => {
                      const mx = e.clientX, my = e.clientY
                      targetScales.current = iconRefs.current.map((el) => {
                        if (!el) return 1
                        const r = el.getBoundingClientRect()
                        return mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom ? MAX_SCALE : 1
                      })
                      startSpring()
                    }}
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
                        background: "rgba(28,28,30,0.92)",
                        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                        borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                        fontSize: Math.round(w * 0.016), fontWeight: 400,
                        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                        color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                        pointerEvents: "none", zIndex: 100,
                        opacity: hoveredSlot === "app" ? 1 : 0,
                        transition: "opacity 0.12s ease",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
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
                      const isActive = openWindows.some(w => w.projectIdx === idx)
                      const iconSrc = isDark ? (p.iconDark ?? p.icon) : (p.icon ?? p.iconDark)
                      const thumb = iconSrc ?? p.images?.[0]
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
                          onClick={(e) => {
                            e.stopPropagation()
                            openWindow(idx)
                          }}
                        >
                          {/* label */}
                          <div style={{
                            position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                            left: "50%", transform: "translateX(-50%)",
                            background: "rgba(28,28,30,0.92)",
                            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                            borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                            fontSize: Math.round(w * 0.016), fontWeight: 400,
                            fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
                            color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                            pointerEvents: "none", zIndex: 100,
                            opacity: hoveredSlot === slotKey ? 1 : 0,
                            transition: "opacity 0.12s ease",
                            boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
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
                            background: isDark ? "#1a1a1c" : "#ffffff",
                          }}>
                            {thumb
                              ? <img src={thumb} alt={p.title ?? `project ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: iconSrc ? "contain" : "cover", padding: iconSrc ? "14%" : 0, display: "block", boxSizing: "border-box" }} draggable={false} />
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
                    {showTerminalIcon && <>
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
                          background: "rgba(28,28,30,0.92)",
                          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                          borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                          fontSize: Math.round(w * 0.016), fontWeight: 400,
                          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                          color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 100,
                          opacity: hoveredSlot === "terminal" ? 1 : 0,
                          transition: "opacity 0.12s ease",
                          boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
                          display: "flex", alignItems: "center", gap: Math.round(w * 0.007),
                        }}>
                          Terminal
                          <span style={{
                            fontSize: Math.round(w * 0.014), color: "rgba(255,255,255,0.4)",
                            fontWeight: 400,
                          }}>⌘↩</span>
                        </div>
                        <div style={{
                          width: slotSize, height: slotSize,
                          transform: `scale(${scales[dockCount + 1] ?? 1})`,
                          transformOrigin: "bottom center",
                          willChange: "transform",
                          borderRadius: Math.round(slotSize * 0.22),
                          background: isDark
                            ? (terminalOpen ? "linear-gradient(145deg,#1a1a2e,#16213e)" : "linear-gradient(145deg,#1c1c1e,#2c2c2e)")
                            : (terminalOpen ? "linear-gradient(145deg,#e8f5e9,#f0f8ff)" : "#ffffff"),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: terminalOpen
                            ? "0 0 0 1.5px #30d158, 0 2px 8px rgba(0,0,0,0.6)"
                            : "0 1px 5px rgba(0,0,0,0.6)",
                          transition: "box-shadow 0.2s, background 0.2s",
                          flexShrink: 0,
                          animation: termMinimized ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined,
                        }}>
                          <svg width={slotSize * 0.5} height={slotSize * 0.5} viewBox="0 0 24 24" fill="none">
                            <polyline points="4 17 10 11 4 5" stroke={isDark ? "white" : "#1c1c1e"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="19" x2="20" y2="19" stroke={isDark ? "white" : "#1c1c1e"} strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    </>}

                    {/* GitHub icon */}
                    {showGithubIcon && <>
                      {!showTerminalIcon && (
                        <div style={{
                          width: 0.5, height: slotSize * 0.7, alignSelf: "center",
                          background: "rgba(255,255,255,0.2)", borderRadius: 1, flexShrink: 0,
                          marginLeft: 1, marginRight: 1,
                        }} />
                      )}
                      <div
                        ref={(el) => { iconRefs.current[dockCount + 1 + (showTerminalIcon ? 1 : 0)] = el }}
                        onMouseEnter={() => setHoveredSlot("github")}
                        onMouseLeave={() => setHoveredSlot(null)}
                        style={{
                          width: slotSize, height: slotSize, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", overflow: "visible", position: "relative",
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (projects && openWindows.length === 0) {
                            setTermOrigin(getOrigin(e)); setTerminalOpen(true)
                            setTimeout(() => setTermLines(l => [...l, { text: "  Select a project first.", color: "#ff453a" }]), 120)
                          } else if (githubUrl && githubUrl !== "#") {
                            window.open(githubUrl, "_blank", "noopener,noreferrer")
                          }
                        }}
                      >
                        {/* macOS label */}
                        <div style={{
                          position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                          left: "50%", transform: "translateX(-50%)",
                          background: "rgba(28,28,30,0.92)",
                          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                          borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                          fontSize: Math.round(w * 0.016), fontWeight: 400,
                          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                          color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 100,
                          opacity: hoveredSlot === "github" ? 1 : 0,
                          transition: "opacity 0.12s ease",
                          boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
                        }}>GitHub</div>
                        <div style={{
                          width: slotSize, height: slotSize,
                          transform: `scale(${scales[dockCount + 1 + (showTerminalIcon ? 1 : 0)] ?? 1})`,
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
        @keyframes mbImgClose {
          0%   { opacity: 1; transform: scale(1)    translateY(0); filter: blur(0px); }
          40%  { opacity: 0.7; transform: scale(0.97) translateY(4px); filter: blur(1px); }
          100% { opacity: 0; transform: scale(0.91) translateY(12px); filter: blur(6px); }
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
        @keyframes winIn {
          0%   { opacity: 0; transform: scale(0.92) translateY(12px); }
          60%  { opacity: 1; transform: scale(1.01) translateY(-2px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  )
}
