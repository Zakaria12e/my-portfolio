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

const COMMANDS = ["desc", "stack", "features", "github", "live", "clear", "cls", "help", "cd", "ls", "mkdir", "touch", "write"]
const FOLDER_ICON = "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775403470/folder_ecvyzl.png"
const FILE_ICON   = "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775403780/file_a2y8we.png"

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

type FsEntry = { name: string; type: "folder" | "file" }
type TermFs   = Record<string, FsEntry[]>

function getDirs(cwd: string, slugs: string[], userFs: TermFs = {}): string[] {
  const userDirs = (userFs[cwd] ?? []).filter(e => e.type === "folder").map(e => e.name)
  if (cwd === "~") return ["projects", ...userDirs]
  if (cwd === "~/projects") return [...slugs, ...userDirs, ".."]
  if (/^~\/projects\/[^/]+$/.test(cwd)) return ["src", "public", ...userDirs, ".."]
  return [...userDirs, ".."]
}

function getStaticItems(cwd: string, slugs: string[]): FsEntry[] {
  if (cwd === "~")         return [{ name: "projects", type: "folder" }]
  if (cwd === "~/projects") return slugs.map(s => ({ name: s, type: "folder" as const }))
  if (/^~\/projects\/[^/]+$/.test(cwd))         return [
    { name: "src", type: "folder" }, { name: "public", type: "folder" },
    { name: "package.json", type: "file" }, { name: "README.md", type: "file" },
  ]
  if (/^~\/projects\/[^/]+\/src$/.test(cwd))    return [
    { name: "index.tsx", type: "file" }, { name: "App.tsx", type: "file" }, { name: "components", type: "folder" },
  ]
  if (/^~\/projects\/[^/]+\/public$/.test(cwd)) return [
    { name: "index.html", type: "file" }, { name: "favicon.ico", type: "file" },
  ]
  return []
}

export default function MacbookPro({ src, images: imagesProp, description: descProp, githubUrl: githubProp, liveUrl: liveProp, tags: tagsProp, features: featuresProp, projects, width = 440, className = "" }: MacbookProProps) {

  const [openWindows, setOpenWindows] = useState<WinState[]>([])
  const [focusedWinId, setFocusedWinId] = useState<number | null>(null)
  const [windowOrder, setWindowOrder] = useState<(number | "settings" | "terminal" | "safari")[]>([])
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
  const [termPos, setTermPos] = useState({ x: 0, y: 0 })
  const [hoveredTermTl, setHoveredTermTl] = useState(-1)
  const termDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMinimized, setSettingsMinimized] = useState(false)
  const [settingsMaximized, setSettingsMaximized] = useState(false)
  const [settingsPos, setSettingsPos] = useState({ x: 0, y: 0 })
  const [settingsSel, setSettingsSel] = useState("developer")
  const WALLPAPERS = [
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775391427/macbg2_lpqquf.avif",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775348567/wp8030357_ctm5ix.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775391444/macbg3_xg9uh1.jpg",
  ]
  const [wallpaper, setWallpaper] = useState(WALLPAPERS[0])
  const settingsDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const [finderOpen, setFinderOpen] = useState(false)
  const [finderSel, setFinderSel] = useState<string | null>(null)
  const [finderSidebarSel, setFinderSidebarSel] = useState("project")
  const [termInput, setTermInput] = useState("")
  const [termCwd, setTermCwd] = useState("~")
  const [termLines, setTermLines] = useState<{ text?: string; color?: string; items?: FsEntry[]; parts?: { text: string; color?: string }[] }[]>([])
  const [termFs, setTermFs] = useState<TermFs>({})
  const termFsRef = useRef<TermFs>({})
  const [desktopItems, setDesktopItems] = useState<{ id: number; name: string; type: "folder"|"file"; slot: number; dx: number; dy: number; selected: boolean }[]>([])
  const desktopItemIdRef = useRef(0)
  const desktopDragRef   = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const desktopClickRef  = useRef<{ id: number; time: number }>({ id: -1, time: 0 })
  const [folderWins, setFolderWins] = useState<{ id: number; name: string; path: string; pos: { x: number; y: number } }[]>([])
  const folderWinIdRef  = useRef(0)
  const folderWinDragRef = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const itemClickRef     = useRef<{ path: string; time: number }>({ path: "", time: 0 })
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [fileEditorWins, setFileEditorWins] = useState<{ id: number; name: string; path: string; pos: { x: number; y: number } }[]>([])
  const fileEditorIdRef  = useRef(0)
  const fileEditorDragRef = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const [controlCenterOpen, setControlCenterOpen] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [accentColor, setAccentColor] = useState("#0a84ff")
  const [showNotch, setShowNotch] = useState(true)
  const [safariOpen, setSafariOpen] = useState(false)
  const [safariMinimized, setSafariMinimized] = useState(false)
  const [safariMinimizing, setSafariMinimizing] = useState(false)
  const [safariMaximized, setSafariMaximized] = useState(false)
  const [safariPos, setSafariPos] = useState({ x: 0, y: 0 })
  const [safariUrl, setSafariUrl] = useState("")
  const [safariInput, setSafariInput] = useState("")
  const [safariHoveredTl, setSafariHoveredTl] = useState(-1)
  const safariDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const [scales, setScales] = useState<number[]>([])
  const [termOrigin, setTermOrigin]   = useState("50% 100%")
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const macRef      = useRef<HTMLDivElement>(null)
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
  const { theme, setTheme } = useTheme()
  const globalDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const [macDark, setMacDark] = useState(() => globalDark)
  const isDark = macDark

  // Keep openWindowsRef in sync for use in callbacks without stale closures
  openWindowsRef.current = openWindows
  termFsRef.current = termFs

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
  // ── scroll-based wake/sleep ────────────────────────────────────────────────
  useEffect(() => {
    const el = macRef.current
    if (!el) return
    let wakeTimer: ReturnType<typeof setTimeout> | null = null
    const check = () => {
      const rect = el.getBoundingClientRect()
      const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
      const ratio = Math.max(0, visible) / rect.height
      if (ratio >= 0.65) {
        if (!wakeTimer) wakeTimer = setTimeout(() => setHovered(true), 100)
      } else {
        if (wakeTimer) { clearTimeout(wakeTimer); wakeTimer = null }
        setHovered(false)
      }
    }
    window.addEventListener("scroll", check, { passive: true })
    return () => { window.removeEventListener("scroll", check); if (wakeTimer) clearTimeout(wakeTimer) }
  }, [])

  // ── multi-window helpers ───────────────────────────────────────────────────
  const updateWin = useCallback((id: number, patch: Partial<WinState>) => {
    setOpenWindows(ws => ws.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const bringToFront = useCallback((key: number | "settings" | "safari") => {
    setWindowOrder(o => [...o.filter(k => k !== key), key])
  }, [])

  const focusWin = useCallback((id: number) => {
    setOpenWindows(ws => {
      const win = ws.find(w => w.id === id)
      if (!win) return ws
      return [...ws.filter(w => w.id !== id), win]
    })
    setFocusedWinId(id)
    setWindowOrder(o => [...o.filter(k => k !== id), id])
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
    setWindowOrder(o => o.filter(k => k !== id))
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
      setWindowOrder(o => [...o.filter(k => k !== existing.id), existing.id])
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
    setWindowOrder(o => [...o.filter(k => k !== id), id])
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
      const fs = termFsRef.current
      const staticValid = [
        "~", "~/projects",
        ...allProjectSlugs.map(s => `~/projects/${s}`),
        ...allProjectSlugs.flatMap(s => [`~/projects/${s}/src`, `~/projects/${s}/public`]),
      ]
      // also allow cd into user-created folders
      const parentPath = newCwd.includes("/") ? newCwd.slice(0, newCwd.lastIndexOf("/")) : "~"
      const entryName  = newCwd.slice(newCwd.lastIndexOf("/") + 1)
      const isUserFolder = (fs[parentPath] ?? []).some(e => e.name === entryName && e.type === "folder")
      if (staticValid.includes(newCwd) || isUserFolder) {
        setTermCwd(newCwd)
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
    } else if (cmd === "ls") {
      const fs = termFsRef.current
      const staticItems = getStaticItems(cwd, allProjectSlugs)
      const userItems   = fs[cwd] ?? []
      const all: FsEntry[] = [...staticItems, ...userItems]
      if (all.length === 0) {
        setTermLines(l => [...l, echo, { text: "  (empty directory)", color: "#888" }])
      } else {
        setTermLines(l => [...l, echo, { items: all }])
      }
    } else if (cmd.startsWith("mkdir")) {
      const name = raw.trim().slice(5).trim()
      if (!name) {
        setTermLines(l => [...l, echo, { text: "  usage: mkdir <name>", color: "#ff453a" }])
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
        setTermLines(l => [...l, echo, { text: `  mkdir: invalid name — use letters, numbers, _ . -`, color: "#ff453a" }])
      } else {
        const fs = termFsRef.current
        if ((fs[cwd] ?? []).some(e => e.name === name)) {
          setTermLines(l => [...l, echo, { text: `  mkdir: ${name}: already exists`, color: "#ff9f0a" }])
        } else {
          setTermFs(prev => ({ ...prev, [cwd]: [...(prev[cwd] ?? []), { name, type: "folder" }] }))
          setTermLines(l => [...l, echo, { text: `  ✓ Created folder: ${name}`, color: "#30d158" }])
          // place on desktop when created at root
          if (cwd === "~") {
            const slot = desktopItemIdRef.current
            desktopItemIdRef.current += 1
            setDesktopItems(prev => [...prev, { id: slot, name, type: "folder", slot, dx: 0, dy: 0, selected: false }])
          }
        }
      }
    } else if (cmd.startsWith("touch")) {
      const name = raw.trim().slice(5).trim()
      if (!name) {
        setTermLines(l => [...l, echo, { text: "  usage: touch <filename>", color: "#ff453a" }])
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
        setTermLines(l => [...l, echo, { text: `  touch: invalid name — use letters, numbers, _ . -`, color: "#ff453a" }])
      } else {
        const fs = termFsRef.current
        if ((fs[cwd] ?? []).some(e => e.name === name)) {
          setTermLines(l => [...l, echo, { text: `  ${name}: already exists`, color: "#ff9f0a" }])
        } else {
          setTermFs(prev => ({ ...prev, [cwd]: [...(prev[cwd] ?? []), { name, type: "file" }] }))
          setTermLines(l => [...l, echo, { text: `  ✓ Created file: ${name}`, color: "#30d158" }])
          // place on desktop when created at root
          if (cwd === "~") {
            const slot = desktopItemIdRef.current
            desktopItemIdRef.current += 1
            setDesktopItems(prev => [...prev, { id: slot, name, type: "file", slot, dx: 0, dy: 0, selected: false }])
          }
        }
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
    } else if (cmd.startsWith("write")) {
      const rest    = raw.trim().slice(5).trim()
      const spaceAt = rest.indexOf(" ")
      const name    = spaceAt === -1 ? rest : rest.slice(0, spaceAt)
      const content = spaceAt === -1 ? "" : rest.slice(spaceAt + 1)
      if (!name) {
        setTermLines(l => [...l, echo, { parts: [
          { text: "  usage: ", color: "#ff453a" },
          { text: "write ", color: "#64d2ff" },
          { text: "<filename> <text>", color: "#ffd60a" },
        ]}])
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
        setTermLines(l => [...l, echo, { text: `  write: invalid filename — use letters, numbers, _ . -`, color: "#ff453a" }])
      } else {
        const fs     = termFsRef.current
        const path   = cwd === "~" ? `~/${name}` : `${cwd}/${name}`
        const exists = (fs[cwd] ?? []).some(e => e.name === name && e.type === "file")
        if (!exists) {
          // auto-create the file first
          setTermFs(prev => ({ ...prev, [cwd]: [...(prev[cwd] ?? []), { name, type: "file" }] }))
          if (cwd === "~") {
            const slot = desktopItemIdRef.current++
            setDesktopItems(prev => [...prev, { id: slot, name, type: "file", slot, dx: 0, dy: 0, selected: false }])
          }
        }
        setFileContents(prev => ({ ...prev, [path]: content }))
        setTermLines(l => [...l, echo, { parts: [
          { text: "  ✓ ", color: "#30d158" },
          { text: name, color: "#64d2ff" },
          { text: " written  ", color: "#30d158" },
          { text: `(${content.length} chars)`, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" },
        ]}])
      }
    } else if (cmd === "clear" || cmd === "cls") {
      setTermLines([])
    } else if (cmd === "help") {
      const c = { cmd: "#64d2ff", arg: "#ffd60a", sep: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)", dim: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)", sec: "#bf5af2", desc: isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.58)" }
      const row = (cmd: string, args: string, desc: string) => ({ parts: [
        { text: "  " },
        { text: cmd.padEnd(8), color: c.cmd },
        { text: (args + " ").padEnd(16), color: c.arg },
        { text: desc, color: c.desc },
      ]})
      setTermLines(l => [...l, echo,
        { parts: [{ text: "  filesystem", color: c.sec }] },
        row("ls",      "",               "list directory contents"),
        row("mkdir",   "<name>",         "create a folder"),
        row("touch",   "<name>",         "create an empty file"),
        row("write",   "<file> <text>",  "write text into a file"),
        row("cd",      "<dir>",          "navigate  (Tab autocompletes)"),
        { text: "" },
        { parts: [{ text: "  project", color: c.sec }] },
        row("desc",    "",               "show project description"),
        row("stack",   "",               "show tech stack"),
        row("features","",               "list key features"),
        row("github",  "",               "open repo in browser"),
        row("live",    "",               "open live demo"),
        { text: "" },
        { parts: [{ text: "  terminal", color: c.sec }] },
        row("clear",   "",               "clear the screen"),
        row("help",    "",               "show this menu"),
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
      // sync desktop items back into termFs["~"] so ls reflects the screen
      setTermFs(prev => ({
        ...prev,
        "~": desktopItems.map(d => ({ name: d.name, type: d.type })),
      }))
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
    const totalSlots = 1 + dockCount + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0) + 4
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
  const MAX_SCALE = 1.55
  const RANGE     = ICON_BASE * 2.2

  const startSpring = useCallback(() => {
    if (rafRef.current !== null) return
    const loop = () => {
      let done = true
      const next = currentScales.current.map((cur, i) => {
        const tgt  = targetScales.current[i] ?? 1
        const diff = tgt - cur
        if (Math.abs(diff) < 0.0015) return tgt
        done = false
        return cur + diff * 0.24
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
    { type: "vscode"   as const, refIdx: dockCount + 1 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0) },
    { type: "messages" as const, refIdx: dockCount + 2 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0) },
    { type: "safari"   as const, refIdx: dockCount + 3 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0) },
    { type: "settings" as const, refIdx: dockCount + 4 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0) },
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
      if (e.key === "q" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // close the topmost window in the unified stack
        const top = [...windowOrder].reverse().find(k => {
          if (k === "settings") return settingsOpen && !settingsMinimized
          if (k === "terminal") return terminalOpen && !termMinimized
          if (k === "safari") return safariOpen && !safariMinimized
          return openWindows.some(w => w.id === k && !w.minimized)
        })
        if (top === "settings") {
          setSettingsOpen(false); setSettingsMinimized(false); setSettingsMaximized(false)
          setSettingsPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "settings"))
        } else if (top === "terminal") {
          setTerminalOpen(false); setTermLines([]); setTermInput(""); setTermPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "terminal"))
        } else if (top === "safari") {
          setSafariOpen(false); setSafariMinimized(false); setSafariMaximized(false)
          setSafariPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "safari"))
        } else if (typeof top === "number") {
          closeWindow(top)
        }
        return
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (termMinimized) {
          setTermMinimized(false)
          setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
          setTimeout(() => inputRef.current?.focus(), 50)
        } else {
          setTerminalOpen(o => {
            const next = !o
            setWindowOrder(wo => next ? [...wo.filter(k => k !== "terminal"), "terminal"] : wo.filter(k => k !== "terminal"))
            return next
          })
        }
        return
      }
      if (e.key === "Escape") {
        setTerminalOpen(false); setWindowOrder(o => o.filter(k => k !== "terminal"))
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
      if (!quickLookOpen && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
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
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        const item = dockItems[focusedDockIdxRef.current]
        if (!item) return
        if (item.type === "finder") { setFinderOpen(o => !o) }
        if (item.type === "project") {
          openWindow(item.projIdx)
        }
        if (item.type === "terminal") {
          const isOnTop = windowOrder[windowOrder.length - 1] === "terminal"
          if (!terminalOpen || termMinimized) {
            setTermMinimized(false); setTermMinimizing(false); setTerminalOpen(true)
            setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
            setTimeout(() => inputRef.current?.focus(), 50)
          } else if (isOnTop) {
            setTermMinimizing(true)
            setTimeout(() => { setTermMinimized(true); setTermMinimizing(false) }, 340)
          } else {
            setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }
        if (item.type === "safari") {
          if (safariOpen && safariMinimized) { setSafariMinimized(false); bringToFront("safari") }
          else { setSafariOpen(o => !o); bringToFront("safari") }
        }
        if (item.type === "settings") {
          if (settingsOpen && settingsMinimized) { setSettingsMinimized(false); bringToFront("settings") }
          else { setSettingsOpen(o => !o); bringToFront("settings") }
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
  }, [hovered, terminalOpen, termMinimized, quickLookOpen, imgList.length, dockItems, computeTargets, githubUrl, focusedWinId, closeWindow, termPos, windowOrder, settingsOpen, settingsMinimized, openWindows, bringToFront])

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
      background: globalDark ? "#1e1e20" : "#e8e8ea",
      borderRadius: `${Math.round(w * 0.023)}px ${Math.round(w * 0.023)}px 0 0`,
      borderTop: globalDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
      borderLeft: globalDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
      borderRight: globalDark ? "1.5px solid #2e2e30" : "1.5px solid #c8c8ca",
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
        background: isDark ? "rgba(18,18,20,0.92)" : "rgba(255,255,255,0.68)",
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        borderRadius: `0 0 ${Math.round(w * 0.022)}px ${Math.round(w * 0.022)}px`,
        borderLeft: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(255,255,255,0.7)",
        borderRight: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(255,255,255,0.7)",
        borderBottom: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(255,255,255,0.7)",
        borderTop: "none",
        boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)" : "0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
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
      background: `url("${wallpaper}") center/cover no-repeat`,
      transition: "background 0.4s ease",
      zIndex: 1,
      cursor: `url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424556/normal-select_ihp9on.svg") 1 1, default`,
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
      background: globalDark
        ? "linear-gradient(180deg,#4a4a4e 0%,#3a3a3c 100%)"
        : "linear-gradient(180deg,#c0c0c2 0%,#b0b0b2 100%)",
      borderRadius: "0 0 6px 6px",
      borderLeft: globalDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderRight: globalDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderBottom: globalDark ? "1px solid #555558" : "1px solid #a0a0a2",
      borderTop: "none",
      boxShadow: globalDark
        ? "0 2px 4px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 2px 4px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.5)",
      zIndex: 20,
    },
    base: {
      width: baseW, height: baseH,
      background: globalDark
        ? "linear-gradient(180deg,#2c2c2e 0%,#222224 55%,#1a1a1c 100%)"
        : "linear-gradient(180deg,#dcdcde 0%,#d0d0d2 55%,#c8c8ca 100%)",
      borderRadius: "0 0 8px 8px",
      borderLeft: globalDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderRight: globalDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderBottom: globalDark ? "1px solid #181819" : "1px solid #b8b8ba",
      borderTop: globalDark ? "1.5px solid #3a3a3c" : "1.5px solid #e8e8ea",
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
      ref={macRef}
      className={className}
      style={s.scene}
    >
      <div style={s.lid}>
        <div style={s.bezel}>
          <div style={{
            ...s.notch,
            transformOrigin: "top center",
            transform: showNotch ? "translateX(-50%) scaleY(1)" : "translateX(-50%) scaleY(0)",
            opacity: showNotch ? 1 : 0,
            transition: showNotch
              ? "transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease"
              : "transform 0.22s cubic-bezier(0.55,0,1,0.45), opacity 0.18s ease",
          }}>
            <div style={s.cam} />
          </div>

          {/* macOS notification */}
          <div style={s.notifPill}>
            <div style={s.notifContent}>
              {/* App header row */}
              <div style={{
                display: "flex", alignItems: "center", gap: Math.round(w * 0.01),
                padding: `${Math.round(h * 0.022)}px ${Math.round(w * 0.022)}px ${Math.round(h * 0.008)}px`,
                borderBottom: isDark ? "0.5px solid rgba(255,255,255,0.07)" : "0.5px solid rgba(0,0,0,0.06)",
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
                  color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                  letterSpacing: 0.1, flex: 1,
                }}>Messages</span>
                <span style={{
                  fontSize: Math.round(w * 0.016),
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.28)",
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
                  color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)", lineHeight: 1.2,
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                }}>Zakaria</span>
                <span style={{
                  fontSize: Math.round(w * 0.019), fontWeight: 400,
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)", lineHeight: 1.3,
                  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
                }}>Let&apos;s build something great 🤝</span>
              </div>
            </div>
          </div>

          <div ref={screenRef} data-mac-screen style={s.screen} onMouseEnter={resetTargets} onClick={() => setControlCenterOpen(false)}>
            <div style={s.screenOff} />
            <div style={s.screenOn} onClick={() => setDesktopItems(prev => prev.map(d => ({ ...d, selected: false })))}>

              {/* Desktop icons — folders/files created via terminal */}
              {desktopItems.length > 0 && (() => {
                const mbH      = Math.round(h * 0.036)
                const dockH    = Math.round(w * 0.13)
                const availH   = h - mbH - dockH
                const iw       = Math.round(w * 0.072)
                const ih       = Math.round(w * 0.09)
                const gap      = Math.round(w * 0.014)
                const padR     = Math.round(w * 0.022)
                const padT     = Math.round(w * 0.018)
                const perCol   = Math.max(1, Math.floor((availH - padT) / (ih + gap)))
                return desktopItems.map(item => {
                  const col  = Math.floor(item.slot / perCol)
                  const row  = item.slot % perCol
                  const bx   = (w - 20) - padR - iw - col * (iw + gap)
                  const by   = mbH + padT + row * (ih + gap)
                  const ix   = bx + item.dx
                  const iy   = by + item.dy
                  const iconSrc = item.type === "folder" ? FOLDER_ICON : FILE_ICON
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => {
                        e.stopPropagation()
                        // double-click detection
                        const now = Date.now()
                        const last = desktopClickRef.current
                        if (last.id === item.id && now - last.time < 350) {
                          const ipath = `~/${item.name}`
                          if (item.type === "folder") {
                            const fid = folderWinIdRef.current++
                            const fx = Math.round((w - 20) * 0.15) + fid * 24
                            const fy = Math.round(h * 0.1) + fid * 20
                            setFolderWins(prev => [...prev, { id: fid, name: item.name, path: ipath, pos: { x: fx, y: fy } }])
                          } else {
                            const existing = fileEditorWins.find(f => f.path === ipath)
                            if (!existing) {
                              const eid = fileEditorIdRef.current++
                              const ex = Math.round((w - 20) * 0.12) + eid * 22
                              const ey = Math.round(h * 0.09) + eid * 18
                              setFileEditorWins(prev => [...prev, { id: eid, name: item.name, path: ipath, pos: { x: ex, y: ey } }])
                            }
                          }
                          desktopClickRef.current = { id: -1, time: 0 }
                          return
                        }
                        desktopClickRef.current = { id: item.id, time: now }
                        setDesktopItems(prev => prev.map(d => ({ ...d, selected: d.id === item.id })))
                        desktopDragRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, ox: item.dx, oy: item.dy }
                        const onMove = (ev: MouseEvent) => {
                          const drag = desktopDragRef.current
                          if (!drag || drag.id !== item.id) return
                          setDesktopItems(prev => prev.map(d => d.id === drag.id
                            ? { ...d, dx: drag.ox + ev.clientX - drag.startX, dy: drag.oy + ev.clientY - drag.startY }
                            : d
                          ))
                        }
                        const onUp = () => {
                          desktopDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{
                        position: "absolute",
                        left: ix, top: iy,
                        width: iw, height: ih,
                        display: "flex", flexDirection: "column", alignItems: "center",
                        gap: Math.round(w * 0.006),
                        zIndex: 1,
                        cursor: "default",
                        userSelect: "none",
                        borderRadius: 6,
                        background: item.selected ? "rgba(10,132,255,0.18)" : "transparent",
                        padding: `${Math.round(w * 0.005)}px`,
                        boxSizing: "border-box",
                      }}
                    >
                      <img
                        src={iconSrc}
                        draggable={false}
                        style={{ width: Math.round(w * 0.054), height: Math.round(w * 0.054), objectFit: "contain", display: "block", flexShrink: 0 }}
                      />
                      <span style={{
                        fontSize: Math.round(w * 0.013),
                        color: "white",
                        textAlign: "center",
                        lineHeight: 1.2,
                        wordBreak: "break-all",
                        maxWidth: "100%",
                        textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)",
                        padding: `1px ${Math.round(w * 0.005)}px`,
                        borderRadius: 3,
                        background: item.selected ? "rgba(10,132,255,0.5)" : "transparent",
                      }}>
                        {item.name}
                      </span>
                    </div>
                  )
                })
              })()}

              {/* Folder windows — opened by double-clicking a desktop folder */}
              {folderWins.map(fw => {
                const fwW = Math.round(w * 0.62)
                const fwH = Math.round(h * 0.58)
                const titleH = 22
                const tlSz2  = Math.round(titleH * 0.54)
                const tlGap2 = Math.round(titleH * 0.45)
                const tlLeft2= Math.round(titleH * 0.64)
                const fwBg   = isDark ? "#1c1c1e" : "#f4f4f6"
                const fwDiv  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                const fwText = isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.8)"
                const fwSub  = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)"
                const contents = termFsRef.current[fw.path] ?? []
                return (
                  <div
                    key={fw.id}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      left: fw.pos.x, top: fw.pos.y,
                      width: fwW, height: fwH,
                      borderRadius: 10,
                      background: fwBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.6)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.14)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: 50 + fw.id,
                      animation: "winIn 0.28s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        e.preventDefault()
                        folderWinDragRef.current = { id: fw.id, startX: e.clientX, startY: e.clientY, ox: fw.pos.x, oy: fw.pos.y }
                        const onMove = (ev: MouseEvent) => {
                          const drag = folderWinDragRef.current
                          if (!drag || drag.id !== fw.id) return
                          setFolderWins(prev => prev.map(f => f.id === fw.id
                            ? { ...f, pos: { x: drag.ox + ev.clientX - drag.startX, y: drag.oy + ev.clientY - drag.startY } }
                            : f
                          ))
                        }
                        const onUp = () => { folderWinDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: titleH, flexShrink: 0, background: isDark ? "#2c2c2e" : "#ececec", borderBottom: `0.5px solid ${fwDiv}`, display: "flex", alignItems: "center", position: "relative", userSelect: "none", cursor: "grab" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap2, paddingLeft: tlLeft2 }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41" },
                          { fill: "#f6be50", border: "#e1a73e" },
                          { fill: "#61c555", border: "#2dac2f" },
                        ].map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); if (i === 0) setFolderWins(prev => prev.filter(f => f.id !== fw.id)) }}
                            style={{ width: tlSz2, height: tlSz2, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0 }}
                          />
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: Math.round(w * 0.025), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.58)", fontFamily: "-apple-system,'SF Pro Text',sans-serif" }}>{fw.name}</span>
                      </div>
                    </div>

                    {/* Toolbar */}
                    <div style={{ height: 28, flexShrink: 0, background: isDark ? "#242426" : "#f0f0f2", borderBottom: `0.5px solid ${fwDiv}`, display: "flex", alignItems: "center", paddingLeft: Math.round(fwW * 0.03), gap: 6 }}>
                      <span style={{ fontSize: Math.round(w * 0.021), color: fwSub, fontFamily: "-apple-system,sans-serif" }}>{fw.path.replace("~", "~")}</span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: "auto", padding: Math.round(fwW * 0.04), display: "flex", flexWrap: "wrap", gap: Math.round(fwW * 0.03), alignContent: "flex-start" }}>
                      {contents.length === 0 ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, opacity: 0.4 }}>
                          <img src={FOLDER_ICON} width={Math.round(w * 0.06)} height={Math.round(w * 0.06)} style={{ objectFit: "contain", opacity: 0.4 }} draggable={false} />
                          <span style={{ fontSize: Math.round(w * 0.024), color: fwSub, fontFamily: "-apple-system,sans-serif" }}>Folder is empty</span>
                          <span style={{ fontSize: Math.round(w * 0.02), color: fwSub, fontFamily: "-apple-system,sans-serif", opacity: 0.7 }}>Use  touch &lt;name&gt;  in terminal</span>
                        </div>
                      ) : (
                        contents.map((item, ci) => {
                          const ipath = `${fw.path}/${item.name}`
                          return (
                            <div
                              key={ci}
                              onMouseDown={() => {
                                const now = Date.now()
                                const last = itemClickRef.current
                                if (last.path === ipath && now - last.time < 350) {
                                  itemClickRef.current = { path: "", time: 0 }
                                  if (item.type === "file") {
                                    const existing = fileEditorWins.find(f => f.path === ipath)
                                    if (!existing) {
                                      const eid = fileEditorIdRef.current++
                                      const ex = Math.round((w - 20) * 0.12) + eid * 22
                                      const ey = Math.round(h * 0.09) + eid * 18
                                      setFileEditorWins(prev => [...prev, { id: eid, name: item.name, path: ipath, pos: { x: ex, y: ey } }])
                                    }
                                  } else {
                                    const fid = folderWinIdRef.current++
                                    setFolderWins(prev => [...prev, { id: fid, name: item.name, path: ipath, pos: { x: Math.round((w-20)*0.15) + fid*24, y: Math.round(h*0.1) + fid*20 } }])
                                  }
                                } else {
                                  itemClickRef.current = { path: ipath, time: now }
                                }
                              }}
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: Math.round(fwW * 0.1), cursor: "default", borderRadius: 6, padding: 4 }}
                            >
                              <img
                                src={item.type === "folder" ? FOLDER_ICON : FILE_ICON}
                                draggable={false}
                                style={{ width: Math.round(fwW * 0.08), height: Math.round(fwW * 0.08), objectFit: "contain", display: "block" }}
                              />
                              <span style={{ fontSize: Math.round(w * 0.016), color: fwText, textAlign: "center", wordBreak: "break-all", lineHeight: 1.2, maxWidth: "100%", fontFamily: "-apple-system,sans-serif" }}>{item.name}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}

              {/* File editor windows */}
              {fileEditorWins.map(fe => {
                const feW = Math.round(w * 0.66)
                const feH = Math.round(h * 0.62)
                const titleH = 22
                const tlSz3   = Math.round(titleH * 0.54)
                const tlGap3  = Math.round(titleH * 0.45)
                const tlLeft3 = Math.round(titleH * 0.64)
                const edBg    = isDark ? "#1a1a1c" : "#ffffff"
                const edDiv   = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
                const edText  = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)"
                const edSub   = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.32)"
                const edLine  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
                const content = fileContents[fe.path] ?? ""
                const lineCount = content.split("\n").length
                return (
                  <div
                    key={fe.id}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      left: fe.pos.x, top: fe.pos.y,
                      width: feW, height: feH,
                      borderRadius: 10,
                      background: edBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.65)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.16)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: 60 + fe.id,
                      animation: "winIn 0.28s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        e.preventDefault()
                        fileEditorDragRef.current = { id: fe.id, startX: e.clientX, startY: e.clientY, ox: fe.pos.x, oy: fe.pos.y }
                        const onMove = (ev: MouseEvent) => {
                          const drag = fileEditorDragRef.current
                          if (!drag || drag.id !== fe.id) return
                          setFileEditorWins(prev => prev.map(f => f.id === fe.id
                            ? { ...f, pos: { x: drag.ox + ev.clientX - drag.startX, y: drag.oy + ev.clientY - drag.startY } }
                            : f
                          ))
                        }
                        const onUp = () => { fileEditorDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: titleH, flexShrink: 0, background: isDark ? "#2c2c2e" : "#ececec", borderBottom: `0.5px solid ${edDiv}`, display: "flex", alignItems: "center", position: "relative", userSelect: "none", cursor: "grab" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap3, paddingLeft: tlLeft3 }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41" },
                          { fill: "#f6be50", border: "#e1a73e" },
                          { fill: "#61c555", border: "#2dac2f" },
                        ].map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); if (i === 0) setFileEditorWins(prev => prev.filter(f => f.id !== fe.id)) }}
                            style={{ width: tlSz3, height: tlSz3, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0 }}
                          />
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", gap: 5 }}>
                        <span style={{ fontSize: Math.round(w * 0.025), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.58)", fontFamily: "-apple-system,'SF Pro Text',sans-serif" }}>{fe.name}</span>
                        {content !== (fileContents[fe.path] ?? "") && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#888", display: "inline-block" }} />}
                      </div>
                    </div>

                    {/* Editor body */}
                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                      {/* Line numbers */}
                      <div style={{ width: Math.round(feW * 0.072), flexShrink: 0, background: isDark ? "#161618" : "#f7f7f9", borderRight: `0.5px solid ${edDiv}`, overflowY: "hidden", padding: `${Math.round(feH * 0.022)}px 0`, display: "flex", flexDirection: "column", alignItems: "flex-end", paddingRight: Math.round(feW * 0.018) }}>
                        {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                          <div key={i} style={{ fontSize: Math.round(w * 0.018), color: edSub, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: "1.65", userSelect: "none" }}>{i + 1}</div>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        value={content}
                        onChange={e => setFileContents(prev => ({ ...prev, [fe.path]: e.target.value }))}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                        spellCheck={false}
                        placeholder="Start typing…"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          resize: "none",
                          padding: `${Math.round(feH * 0.022)}px ${Math.round(feW * 0.03)}px`,
                          color: edText,
                          fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
                          fontSize: Math.round(w * 0.02),
                          lineHeight: "1.65",
                          caretColor: "#0a84ff",
                          scrollbarWidth: "none" as const,
                        }}
                      />
                    </div>

                    {/* Status bar */}
                    <div style={{ height: 18, flexShrink: 0, background: isDark ? "#161618" : "#f0f0f2", borderTop: `0.5px solid ${edLine}`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: Math.round(feW * 0.025), gap: Math.round(feW * 0.04) }}>
                      <span style={{ fontSize: Math.round(w * 0.016), color: edSub, fontFamily: "-apple-system,sans-serif" }}>Ln {lineCount}</span>
                      <span style={{ fontSize: Math.round(w * 0.016), color: edSub, fontFamily: "-apple-system,sans-serif" }}>{content.length} chars</span>
                    </div>
                  </div>
                )
              })}

              {/* Screen scrim — dims wallpaper when a window is open */}
              {(openWindows.some(w => !w.minimized) || (settingsOpen && !settingsMinimized)) && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 2,
                  background: "rgba(0,0,0,0.42)",
                  backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
                  pointerEvents: "none",
                  animation: "mbFade 0.3s ease",
                }} />
              )}

              {/* macOS menu bar */}
              {hovered && (() => {
                const mbH = Math.round(h * 0.036)
                const fs  = Math.round(w * 0.0155)
                return (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: mbH,
                    background: "transparent",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: `${Math.round(mbH * 0.18)}px ${Math.round(w * 0.015)}px 0`,
                    zIndex: 15, pointerEvents: "none",
                    fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
                    fontSize: fs,
                  }}>
                    {/* Left: logo + app name */}
                    <div style={{ display: "flex", alignItems: "center", gap: Math.round(w * 0.012) }}>
                      <img
                        src="/moon-purple.png"
                        alt="logo"
                        style={{ height: Math.round(w * 0.023), width: "auto", display: "block" }}
                      />
                      <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.88)", fontSize: Math.round(w * 0.013), fontFamily: "'Playwrite IE', cursive", letterSpacing: "0.02em" }}>{proj?.title ?? "Zakaria"}</span>
                    </div>
                    {/* Right: control center + clock */}
                    <div style={{ display: "flex", alignItems: "center", gap: Math.round(w * 0.01), pointerEvents: "auto" }}>
                      <div
                        onClick={e => { e.stopPropagation(); setControlCenterOpen(o => !o) }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: Math.round(w * 0.03), height: Math.round(w * 0.03), borderRadius: Math.round(w * 0.006), background: controlCenterOpen ? "rgba(255,255,255,0.18)" : "transparent", transition: "background 0.15s" }}
                      >
                        <img src={isDark ? "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423308/control_centerfor_darkmode_yywvs0.gif" : "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775422540/controle_center_fzldo2.png"} alt="Control Center" draggable={false} style={{ width: Math.round(w * 0.023), height: Math.round(w * 0.023), objectFit: "contain", display: "block" }} />
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 400, letterSpacing: 0.1, fontSize: Math.round(w * 0.013) }}>{clock}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Control Center Panel */}
              {hovered && controlCenterOpen && (() => {
                const mbH     = Math.round(h * 0.036)
                const panW    = Math.round(w * 0.32)
                const gap     = Math.round(panW * 0.028)
                const pad     = Math.round(panW * 0.046)
                const tileR   = Math.round(panW * 0.048)
                const iconSz  = Math.round(panW * 0.115)
                const iconSvg = Math.round(iconSz * 0.5)
                const tileH   = Math.round(panW * 0.42)
                const swatchSz= Math.round(panW * 0.073)
                const ACCENT_COLORS = [
                  { id: "blue",     value: "#0a84ff" },
                  { id: "purple",   value: "#bf5af2" },
                  { id: "pink",     value: "#ff375f" },
                  { id: "red",      value: "#ff453a" },
                  { id: "orange",   value: "#ff9f0a" },
                  { id: "yellow",   value: "#ffd60a" },
                  { id: "green",    value: "#30d158" },
                  { id: "graphite", value: "#8e8e93" },
                ]
                const panBg      = isDark ? "rgba(28,28,30,0.88)" : "rgba(160,160,165,0.38)"
                const tileBg     = isDark ? "rgba(255,255,255,0.09)" : "rgba(200,200,205,0.45)"
                const tileBgOn   = isDark ? "rgba(255,255,255,0.17)" : "rgba(230,230,235,0.78)"
                const iconBgOff  = isDark ? "rgba(255,255,255,0.13)" : "rgba(80,80,85,0.14)"
                const textPri    = isDark ? "rgba(255,255,255,0.93)" : "rgba(0,0,0,0.87)"
                const textSec    = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.50)"
                const panBorder  = isDark ? "rgba(255,255,255,0.1)" : "transparent"
                const ff = "-apple-system,'SF Pro Text',BlinkMacSystemFont,sans-serif"
                const fsPx = (px: number) => Math.round(px * panW / 260)

                return (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: mbH + 3,
                      right: Math.round(w * 0.014),
                      width: panW,
                      zIndex: 20,
                      background: panBg,
                      backdropFilter: isDark ? "blur(60px) saturate(2.2)" : "blur(80px) saturate(2.8)",
                      WebkitBackdropFilter: isDark ? "blur(60px) saturate(2.2)" : "blur(80px) saturate(2.8)",
                      borderRadius: Math.round(panW * 0.058),
                      border: `0.5px solid ${panBorder}`,
                      boxShadow: isDark
                        ? "0 4px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset"
                        : "0 4px 32px rgba(0,0,0,0.1)",
                      padding: pad,
                      display: "flex", flexDirection: "column", gap,
                      animation: "ccIn 0.2s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Row 1: Dark Mode + Animations (2 square tiles) */}
                    <div style={{ display: "flex", gap }}>
                      {[
                        {
                          active: isDark, label: "Dark Mode", status: isDark ? "On" : "Off",
                          onClick: () => setMacDark(d => !d),
                          icon: (
                            <svg width={iconSvg} height={iconSvg} viewBox="0 0 24 24" fill="none">
                              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="white" />
                            </svg>
                          ),
                        },
                        {
                          active: !reducedMotion, label: "Animations", status: !reducedMotion ? "On" : "Off",
                          onClick: () => setReducedMotion(m => !m),
                          icon: (
                            <svg width={iconSvg} height={iconSvg} viewBox="0 0 24 24" fill="none">
                              <path d="M5 3l14 9-14 9V3z" fill="white" />
                              <circle cx="19" cy="12" r="2" fill="white" opacity="0.5" />
                            </svg>
                          ),
                        },
                      ].map(({ active, label, status, onClick, icon }) => (
                        <div
                          key={label}
                          onClick={onClick}
                          style={{
                            flex: 1, height: tileH,
                            background: active ? tileBgOn : tileBg,
                            borderRadius: tileR,
                            padding: Math.round(panW * 0.036),
                            cursor: "pointer",
                            display: "flex", flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "background 0.18s ease",
                            border: `0.5px solid ${active ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)") : "transparent"}`,
                          }}
                        >
                          <div style={{
                            width: iconSz, height: iconSz, borderRadius: "50%",
                            background: active ? accentColor : iconBgOff,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "background 0.18s ease",
                            flexShrink: 0,
                            boxShadow: active ? `0 2px 8px ${accentColor}55` : "none",
                          }}>
                            {icon}
                          </div>
                          <div>
                            <div style={{ fontSize: fsPx(13), fontWeight: 600, fontFamily: ff, color: textPri, lineHeight: "1.3", letterSpacing: "-0.01em" }}>{label}</div>
                            <div style={{ fontSize: fsPx(11), fontWeight: 400, fontFamily: ff, color: textSec, marginTop: 1 }}>{status}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Row 2: Notch — compact horizontal tile */}
                    <div
                      onClick={() => setShowNotch(n => !n)}
                      style={{
                        background: showNotch ? tileBgOn : tileBg,
                        borderRadius: tileR,
                        padding: `${Math.round(panW * 0.028)}px ${Math.round(panW * 0.036)}px`,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", gap: Math.round(panW * 0.032),
                        transition: "background 0.18s ease",
                        border: `0.5px solid ${showNotch ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)") : "transparent"}`,
                      }}
                    >
                      <div style={{
                        width: iconSz, height: iconSz, borderRadius: "50%", flexShrink: 0,
                        background: showNotch ? accentColor : iconBgOff,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.18s ease",
                        boxShadow: showNotch ? `0 2px 8px ${accentColor}55` : "none",
                      }}>
                        <svg width={iconSvg} height={iconSvg} viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="13" rx="2" fill="white" opacity="0.3"/>
                          <rect x="8" y="3" width="8" height="3.5" rx="1.5" fill="white"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: fsPx(13), fontWeight: 600, fontFamily: ff, color: textPri, lineHeight: "1.3" }}>Notch</div>
                        <div style={{ fontSize: fsPx(11), fontWeight: 400, fontFamily: ff, color: textSec, marginTop: 1 }}>{showNotch ? "Visible" : "Hidden"}</div>
                      </div>
                      {/* Toggle pill */}
                      <div style={{
                        width: Math.round(panW * 0.118), height: Math.round(panW * 0.062),
                        borderRadius: 999, flexShrink: 0,
                        background: showNotch ? accentColor : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"),
                        transition: "background 0.22s ease",
                        position: "relative",
                      }}>
                        <div style={{
                          position: "absolute",
                          top: Math.round(panW * 0.007),
                          left: showNotch ? `calc(100% - ${Math.round(panW * 0.048)}px - ${Math.round(panW * 0.007)}px)` : Math.round(panW * 0.007),
                          width: Math.round(panW * 0.048), height: Math.round(panW * 0.048),
                          borderRadius: "50%", background: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                          transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                        }} />
                      </div>
                    </div>

                    {/* Row 2: Accent Color */}
                    <div style={{ background: tileBg, borderRadius: tileR, padding: `${Math.round(panW * 0.036)}px ${Math.round(panW * 0.04)}px`, border: `0.5px solid ${isDark ? "transparent" : "rgba(0,0,0,0.04)"}` }}>
                      <div style={{ fontSize: fsPx(11), fontWeight: 500, fontFamily: ff, color: textSec, marginBottom: Math.round(panW * 0.03), letterSpacing: "0.01em", textTransform: "uppercase" as const }}>Accent Color</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {ACCENT_COLORS.map(c => {
                          const selected = accentColor === c.value
                          return (
                            <div
                              key={c.id}
                              onClick={() => setAccentColor(c.value)}
                              style={{
                                width: swatchSz, height: swatchSz, borderRadius: "50%",
                                background: c.value, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                outline: selected ? `2px solid ${c.value}` : "2px solid transparent",
                                outlineOffset: 2,
                                transition: "outline 0.15s, transform 0.12s",
                                transform: selected ? "scale(1.15)" : "scale(1)",
                              }}
                            >
                              {selected && (
                                <svg width={Math.round(swatchSz * 0.52)} height={Math.round(swatchSz * 0.52)} viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Row 3: Wallpaper */}
                    <div
                      onClick={() => {
                        const idx = WALLPAPERS.indexOf(wallpaper)
                        setWallpaper(WALLPAPERS[(idx + 1) % WALLPAPERS.length])
                      }}
                      style={{
                        background: tileBg, borderRadius: tileR, cursor: "pointer",
                        display: "flex", alignItems: "center",
                        gap: Math.round(panW * 0.038),
                        padding: `${Math.round(panW * 0.03)}px ${Math.round(panW * 0.04)}px`,
                        overflow: "hidden",
                        border: `0.5px solid ${isDark ? "transparent" : "rgba(0,0,0,0.04)"}`,
                        transition: "background 0.15s",
                      }}
                    >
                      <div style={{ flexShrink: 0, borderRadius: Math.round(panW * 0.026), overflow: "hidden", width: Math.round(panW * 0.22), height: Math.round(panW * 0.14), boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                        <img src={wallpaper} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: fsPx(13), fontWeight: 600, fontFamily: ff, color: textPri, lineHeight: "1.3" }}>Wallpaper</div>
                        <div style={{ fontSize: fsPx(11), fontWeight: 400, fontFamily: ff, color: textSec, marginTop: 1 }}>Click to change</div>
                      </div>
                      <div style={{ marginLeft: "auto", color: textSec, fontSize: fsPx(16), lineHeight: 1, flexShrink: 0 }}>›</div>
                    </div>
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
                const screenW    = w - 20
                const baseWinLeft= Math.round((screenW - baseWinW) / 2)
                const titleH = 22
                // const toolH  = 28
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
                  const zIdx = 3 + (windowOrder.indexOf(win.id) >= 0 ? windowOrder.indexOf(win.id) : winIndex)
                  const winW   = baseWinW
                  const winH   = baseWinH
                  const winTop  = baseWinTop  + win.pos.y
                  const winLeft = baseWinLeft + win.pos.x
                  // const btnSz  = Math.round(winW * 0.046)
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
                          fontSize: Math.round(w * 0.021), fontWeight: 500,
                          color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
                          letterSpacing: -0.1,
                          fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
                        }}>{p.title}</span>
                      </div>
                    </div>

                    {/* Body: sidebar + screenshot */}
                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                      {/* Sidebar */}
                      <div style={{
                        width: Math.round(winW * 0.3), flexShrink: 0,
                        background: isDark ? "#222224" : "#eaeaec",
                        borderRight: `0.5px solid ${divClr}`,
                        display: "flex", flexDirection: "column",
                        padding: "8px 9px", gap: 10,
                        overflowY: "auto", scrollbarWidth: "none" as const,
                      }}>
                        {p.description && (
                          <div>
                            <div style={{ fontSize: 7, fontWeight: 600, color: textSec, textTransform: "uppercase" as const, letterSpacing: 0.7, fontFamily: "-apple-system,sans-serif", marginBottom: 3 }}>About</div>
                            <div style={{ fontSize: Math.round(w * 0.019), color: isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.58)", lineHeight: 1.5, fontFamily: "-apple-system,sans-serif", display: "-webkit-box", WebkitLineClamp: 5 as unknown as string, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{p.description}</div>
                          </div>
                        )}
                        {pTags.length > 0 && (
                          <div>
                            <div style={{ fontSize: 7, fontWeight: 600, color: textSec, textTransform: "uppercase" as const, letterSpacing: 0.7, fontFamily: "-apple-system,sans-serif", marginBottom: 3 }}>Stack</div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 3 }}>
                              {pTags.map((tag, i) => {
                                const iconUrl = deviconUrl(tag)
                                return (
                                  <span key={i} style={{
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                    fontSize: Math.round(w * 0.018), padding: "1px 5px 1px 4px", borderRadius: 10,
                                    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                                    color: isDark ? "rgba(255,255,255,0.58)" : "rgba(0,0,0,0.52)",
                                    fontFamily: "-apple-system,sans-serif",
                                    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                                  }}>
                                    {iconUrl && <img src={iconUrl} width={9} height={9} style={{ display: "block", flexShrink: 0 }} />}
                                    {tag}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                          {pLiveUrl && pLiveUrl !== "#" && (
                            <span onClick={e => { e.stopPropagation(); window.open(pLiveUrl, "_blank", "noopener,noreferrer") }}
                              style={{ fontSize: Math.round(w * 0.019), color: "#0a84ff", cursor: "pointer", fontFamily: "-apple-system,sans-serif" }}>↗ Live</span>
                          )}
                          {pHasGit && (
                            <span onClick={e => { e.stopPropagation(); window.open(pGitUrl, "_blank", "noopener,noreferrer") }}
                              style={{ fontSize: Math.round(w * 0.019), color: textSec, cursor: "pointer", fontFamily: "-apple-system,sans-serif" }}>↗ GitHub</span>
                          )}
                        </div>
                      </div>
                      {/* Screenshot */}
                      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#050507" }}>
                        {pImgList.length > 0 && pCurSrc ? (
                          <img key={win.activeImg} src={pCurSrc} alt="screen"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                              animation: "mbImg 0.28s cubic-bezier(0.16,1,0.3,1)" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: Math.round(w * 0.018), color: "rgba(255,255,255,0.1)", fontFamily: "-apple-system,sans-serif" }}>No preview</span>
                          </div>
                        )}
                        {pImgList.length > 1 && (
                          <div onClick={e => { e.stopPropagation(); updateWin(win.id, { activeImg: Math.max(0, win.activeImg - 1) }) }}
                            style={{
                              position: "absolute", left: 5, top: "50%", transform: "translateY(-50%)",
                              width: 14, height: 14, borderRadius: "50%",
                              background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)",
                              border: "0.5px solid rgba(255,255,255,0.15)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: win.activeImg === 0 ? "default" : "pointer",
                              opacity: win.activeImg === 0 ? 0.25 : 0.85, transition: "opacity 0.15s",
                              pointerEvents: win.activeImg === 0 ? "none" : "auto", zIndex: 2,
                            }}>
                            <svg width={6} height={6} viewBox="0 0 24 24" fill="none">
                              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                        {pImgList.length > 1 && (
                          <div onClick={e => { e.stopPropagation(); updateWin(win.id, { activeImg: Math.min(pImgList.length - 1, win.activeImg + 1) }) }}
                            style={{
                              position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)",
                              width: 14, height: 14, borderRadius: "50%",
                              background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)",
                              border: "0.5px solid rgba(255,255,255,0.15)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: win.activeImg === pImgList.length - 1 ? "default" : "pointer",
                              opacity: win.activeImg === pImgList.length - 1 ? 0.25 : 0.85, transition: "opacity 0.15s",
                              pointerEvents: win.activeImg === pImgList.length - 1 ? "none" : "auto", zIndex: 2,
                            }}>
                            <svg width={6} height={6} viewBox="0 0 24 24" fill="none">
                              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                        {pImgList.length > 1 && (
                          <div style={{
                            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                            display: "flex", gap: 4, zIndex: 3,
                          }}>
                            {pImgList.map((_, di) => (
                              <div
                                key={di}
                                onClick={e => { e.stopPropagation(); updateWin(win.id, { activeImg: di }) }}
                                style={{
                                  width: di === win.activeImg ? 12 : 4, height: 4, borderRadius: 2,
                                  background: di === win.activeImg ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                                  cursor: "pointer",
                                  transition: "width 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.15s",
                                  flexShrink: 0,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })
              })()}
              {/* Settings Window */}
              {settingsOpen && !settingsMinimized && (() => {
                const mbH = Math.round(h * 0.036)
                const sw = Math.round(w * 0.82)
                const sh = Math.round(h * 0.75)
                const baseTop  = mbH + Math.round((h - mbH - sh) * 0.15)
                const screenW2 = w - 20
                const baseLeft = Math.round((screenW2 - sw) / 2)
                const sideW = Math.round(sw * 0.32)
                const tlSz  = Math.round(22 * 0.54)
                const tlGap = Math.round(22 * 0.45)
                const tlLeft = Math.round(22 * 0.64)
                const sideItems = [
                  { id: "developer", label: "Developer",  svgPath: "M8 4L4 8l4 4M16 4l4 4-4 4M11 3l-2 10" },
                  { id: "skills",    label: "Skills",     svgPath: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" },
                  { id: "appearance",label: "Appearance", svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" },
                  { id: "contact",   label: "Contact",    svgPath: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
                  { id: "system",    label: "System",     svgPath: "M12 2a10 10 0 100 20A10 10 0 0012 2zm0 4v4l3 3" },
                ]
                const winBg      = isDark ? "#1c1c1e" : "#f4f4f6"
                const sideBg     = isDark ? "#252528" : "#e5e5e7"
                const contentBg  = isDark ? "#1c1c1e" : "#f4f4f6"
                const cardBg     = isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.042)"
                const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                const textPrimary = isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.85)"
                const textSec     = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.38)"
                const textMed     = isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.55)"
                const divClr      = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                const accentBlue  = "#0a84ff"
                const ff          = "-apple-system,'SF Pro Text',sans-serif"
                const fs = (n: number) => Math.round(sw * n)
                return (
                  <div
                    onClick={e => { e.stopPropagation(); bringToFront("settings"); setFocusedWinId(null) }}
                    style={{
                      position: "absolute",
                      ...(settingsMaximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : { top: baseTop + settingsPos.y, left: baseLeft + settingsPos.x, width: sw, height: sh }
                      ),
                      borderRadius: settingsMaximized ? 0 : 10,
                      background: winBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.6), 0 32px 80px rgba(0,0,0,0.55)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.14), 0 32px 80px rgba(0,0,0,0.12)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: 3 + (windowOrder.indexOf("settings") >= 0 ? windowOrder.indexOf("settings") : 0),
                      animation: "winIn 0.32s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        if (settingsMaximized) return
                        e.preventDefault()
                        settingsDragRef.current = { startX: e.clientX, startY: e.clientY, ox: settingsPos.x, oy: settingsPos.y }
                        const onMove = (ev: MouseEvent) => {
                          const drag = settingsDragRef.current
                          if (!drag) return
                          setSettingsPos({ x: drag.ox + ev.clientX - drag.startX, y: drag.oy + ev.clientY - drag.startY })
                        }
                        const onUp = () => { settingsDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: 22, flexShrink: 0, background: isDark ? "#2c2c2e" : "#ececec", borderBottom: `0.5px solid ${divClr}`, display: "flex", alignItems: "center", position: "relative", userSelect: "none", cursor: "grab" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap, paddingLeft: tlLeft }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", fn: () => { setSettingsOpen(false); setSettingsMinimized(false); setSettingsMaximized(false); setSettingsPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "settings")) } },
                          { fill: "#f6be50", border: "#e1a73e", fn: () => setSettingsMinimized(m => !m) },
                          { fill: "#61c555", border: "#2dac2f", fn: () => { setSettingsMaximized(m => !m); setSettingsMinimized(false) } },
                        ].map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); btn.fn() }}
                            style={{ width: tlSz, height: tlSz, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0 }}
                          />
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: Math.round(w * 0.026), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.58)", fontFamily: ff }}>System Settings</span>
                      </div>
                    </div>

                    {/* Body: sidebar + content */}
                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                      {/* Sidebar */}
                      <div style={{ width: sideW, flexShrink: 0, background: sideBg, borderRight: `0.5px solid ${divClr}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                        {/* Profile mini card */}
                        <div style={{ padding: `${Math.round(sh * 0.04)}px ${Math.round(sideW * 0.1)}px ${Math.round(sh * 0.03)}px`, borderBottom: `0.5px solid ${divClr}`, display: "flex", alignItems: "center", gap: Math.round(sideW * 0.09), flexShrink: 0 }}>
                          <div style={{ width: Math.round(sideW * 0.22), height: Math.round(sideW * 0.22), borderRadius: "50%", background: "linear-gradient(135deg,#5856D6 0%,#0a84ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(88,86,214,0.45)" }}>
                            <span style={{ fontSize: Math.round(sideW * 0.12), color: "white", fontWeight: 700, fontFamily: ff }}>Z</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: fs(0.034), fontWeight: 600, color: textPrimary, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Zakaria</div>
                            <div style={{ fontSize: fs(0.024), color: textSec, fontFamily: ff, marginTop: 1, whiteSpace: "nowrap" }}>Full-Stack Dev</div>
                          </div>
                        </div>

                        {/* Nav items */}
                        <div style={{ flex: 1, padding: `${Math.round(sh * 0.025)}px 0`, display: "flex", flexDirection: "column", gap: 1 }}>
                          {sideItems.map(item => {
                            const sel = settingsSel === item.id
                            return (
                              <div key={item.id}
                                onClick={() => setSettingsSel(item.id)}
                                style={{
                                  display: "flex", alignItems: "center", gap: Math.round(sideW * 0.09),
                                  padding: `${Math.round(sh * 0.018)}px ${Math.round(sideW * 0.1)}px`,
                                  borderRadius: 7, margin: `0 ${Math.round(sideW * 0.05)}px`,
                                  background: sel ? (isDark ? "rgba(10,132,255,0.2)" : "rgba(10,132,255,0.14)") : "transparent",
                                  cursor: "pointer", transition: "background 0.12s",
                                }}
                              >
                                <svg width={Math.round(sideW * 0.14)} height={Math.round(sideW * 0.14)} viewBox="0 0 24 24" fill="none" stroke={sel ? accentBlue : textSec} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <path d={item.svgPath} />
                                </svg>
                                <span style={{ fontSize: fs(0.028), fontWeight: sel ? 500 : 400, color: sel ? accentBlue : textPrimary, fontFamily: ff, transition: "color 0.12s" }}>{item.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Content area */}
                      <div style={{ flex: 1, overflowY: "auto", background: contentBg, padding: `${Math.round(sh * 0.052)}px ${Math.round(sw * 0.048)}px`, display: "flex", flexDirection: "column", gap: Math.round(sh * 0.028) }}>

                        {/* ── DEVELOPER ── */}
                        {settingsSel === "developer" && (<>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: Math.round(sh * 0.008) }}>
                            <div>
                              <div style={{ fontSize: fs(0.044), fontWeight: 700, color: textPrimary, fontFamily: ff, lineHeight: 1.15 }}>Zakaria Elbidar</div>
                              <div style={{ fontSize: fs(0.028), color: textSec, fontFamily: ff, marginTop: 3 }}>Full-Stack Developer · Morocco 🇲🇦</div>
                            </div>
                            <div style={{ width: Math.round(sw * 0.1), height: Math.round(sw * 0.1), borderRadius: "50%", background: "linear-gradient(135deg,#5856D6 0%,#0a84ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(88,86,214,0.4)" }}>
                              <span style={{ fontSize: Math.round(sw * 0.052), color: "white", fontWeight: 700, fontFamily: ff }}>Z</span>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div style={{ display: "flex", gap: Math.round(sw * 0.022) }}>
                            {[
                              { value: "3+",     label: "Years exp." },
                              { value: "10+",    label: "Projects" },
                              { value: "React",  label: "Primary" },
                              { value: "TS",     label: "Language" },
                            ].map(stat => (
                              <div key={stat.label} style={{ flex: 1, borderRadius: 9, background: cardBg, border: `0.5px solid ${cardBorder}`, padding: `${Math.round(sh * 0.028)}px ${Math.round(sw * 0.02)}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                <span style={{ fontSize: fs(0.036), fontWeight: 700, color: accentBlue, fontFamily: ff }}>{stat.value}</span>
                                <span style={{ fontSize: fs(0.022), color: textSec, fontFamily: ff }}>{stat.label}</span>
                              </div>
                            ))}
                          </div>

                          {/* Info rows */}
                          <div style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, overflow: "hidden" }}>
                            {[
                              { k: "Role",       v: "Full-Stack Developer" },
                              { k: "Stack",      v: "React · Node.js · TypeScript" },
                              { k: "Based in",   v: "Morocco 🇲🇦" },
                              { k: "Open to",    v: "Remote · Freelance · Full-time" },
                            ].map((row, i, arr) => (
                              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${Math.round(sh * 0.024)}px ${Math.round(sw * 0.038)}px`, borderBottom: i < arr.length - 1 ? `0.5px solid ${divClr}` : "none" }}>
                                <span style={{ fontSize: fs(0.027), color: textSec, fontFamily: ff }}>{row.k}</span>
                                <span style={{ fontSize: fs(0.027), color: textPrimary, fontFamily: ff, fontWeight: 500 }}>{row.v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Bio card */}
                          <div style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, padding: `${Math.round(sh * 0.032)}px ${Math.round(sw * 0.038)}px` }}>
                            <div style={{ fontSize: fs(0.022), color: textSec, fontFamily: ff, marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>About</div>
                            <div style={{ fontSize: fs(0.027), color: textMed, fontFamily: ff, lineHeight: 1.65 }}>
                              Building fast, accessible web apps end-to-end. Passionate about clean architecture, smooth UX, and shipping things that matter.
                            </div>
                          </div>
                        </>)}

                        {/* ── SKILLS ── */}
                        {settingsSel === "skills" && (<>
                          <div style={{ fontSize: fs(0.036), fontWeight: 700, color: textPrimary, fontFamily: ff }}>Technical Skills</div>
                          {[
                            {
                              category: "Frontend",
                              color: "#0a84ff",
                              skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Vue.js"],
                            },
                            {
                              category: "Backend",
                              color: "#30d158",
                              skills: ["Node.js", "Express", "PostgreSQL", "MongoDB", "Prisma", "REST APIs"],
                            },
                            {
                              category: "DevOps & Tools",
                              color: "#ff9f0a",
                              skills: ["Git", "Docker", "Vercel", "AWS", "Vite", "Figma"],
                            },
                          ].map(cat => (
                            <div key={cat.category} style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, padding: `${Math.round(sh * 0.032)}px ${Math.round(sw * 0.038)}px`, display: "flex", flexDirection: "column", gap: Math.round(sh * 0.022) }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                                <span style={{ fontSize: fs(0.028), fontWeight: 600, color: textPrimary, fontFamily: ff }}>{cat.category}</span>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {cat.skills.map(sk => (
                                  <span key={sk} style={{ fontSize: fs(0.024), fontFamily: ff, color: cat.color, background: `${cat.color}18`, border: `0.5px solid ${cat.color}38`, borderRadius: 6, padding: `3px ${Math.round(sw * 0.018)}px`, fontWeight: 500 }}>{sk}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>)}

                        {/* ── APPEARANCE ── */}
                        {settingsSel === "appearance" && (<>
                          <div style={{ fontSize: fs(0.036), fontWeight: 700, color: textPrimary, fontFamily: ff }}>Appearance</div>

                          {/* Dark / Light */}
                          <div style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, padding: `${Math.round(sh * 0.032)}px ${Math.round(sw * 0.038)}px`, display: "flex", flexDirection: "column", gap: Math.round(sh * 0.02) }}>
                            <span style={{ fontSize: fs(0.027), fontWeight: 600, color: textPrimary, fontFamily: ff }}>Mode</span>
                            <div style={{ display: "flex", gap: Math.round(sw * 0.022) }}>
                              {[
                                { label: "Dark", value: true,  preview: "#1c1c1e" },
                                { label: "Light", value: false, preview: "#f4f4f6" },
                              ].map(opt => (
                                <div key={opt.label}
                                  onClick={() => setTheme(opt.value ? "dark" : "light")}
                                  style={{ flex: 1, borderRadius: 9, border: `1.5px solid ${isDark === opt.value ? accentBlue : cardBorder}`, background: isDark === opt.value ? `${accentBlue}18` : cardBg, padding: `${Math.round(sh * 0.024)}px`, cursor: "pointer", transition: "border 0.15s, background 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                                >
                                  <div style={{ width: "100%", height: Math.round(sh * 0.07), borderRadius: 6, background: opt.preview, border: `0.5px solid ${divClr}` }} />
                                  <span style={{ fontSize: fs(0.026), color: isDark === opt.value ? accentBlue : textMed, fontWeight: isDark === opt.value ? 600 : 400, fontFamily: ff }}>{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Wallpaper */}
                          <div style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, padding: `${Math.round(sh * 0.032)}px ${Math.round(sw * 0.038)}px`, display: "flex", flexDirection: "column", gap: Math.round(sh * 0.02) }}>
                            <span style={{ fontSize: fs(0.027), fontWeight: 600, color: textPrimary, fontFamily: ff }}>Wallpaper</span>
                            <div style={{ display: "flex", gap: Math.round(sw * 0.028), flexWrap: "wrap" }}>
                              {WALLPAPERS.map((url, i) => (
                                <div
                                  key={i}
                                  onClick={() => setWallpaper(url)}
                                  style={{
                                    width: Math.round(sw * 0.22), height: Math.round(sw * 0.14),
                                    borderRadius: 8, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                                    backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center",
                                    outline: wallpaper === url ? `2.5px solid ${accentBlue}` : "2.5px solid transparent",
                                    outlineOffset: 2,
                                    boxShadow: wallpaper === url ? `0 0 0 1px ${accentBlue}, 0 2px 12px rgba(10,132,255,0.3)` : "0 1px 6px rgba(0,0,0,0.4)",
                                    transition: "outline 0.15s, box-shadow 0.15s",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </>)}

                        {/* ── CONTACT ── */}
                        {settingsSel === "contact" && (<>
                          <div style={{ fontSize: fs(0.036), fontWeight: 700, color: textPrimary, fontFamily: ff }}>Get in Touch</div>

                          {/* CTA banner */}
                          <div style={{ borderRadius: 10, background: `linear-gradient(135deg, ${isDark ? "rgba(88,86,214,0.22)" : "rgba(88,86,214,0.1)"} 0%, ${isDark ? "rgba(10,132,255,0.18)" : "rgba(10,132,255,0.08)"} 100%)`, border: `0.5px solid ${isDark ? "rgba(88,86,214,0.3)" : "rgba(88,86,214,0.2)"}`, padding: `${Math.round(sh * 0.04)}px ${Math.round(sw * 0.04)}px` }}>
                            <div style={{ fontSize: fs(0.03), fontWeight: 600, color: textPrimary, fontFamily: ff, marginBottom: 6 }}>Open to opportunities</div>
                            <div style={{ fontSize: fs(0.026), color: textMed, fontFamily: ff, lineHeight: 1.6 }}>Remote, freelance, or full-time — always happy to connect on interesting projects.</div>
                          </div>

                          {/* Links */}
                          <div style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, overflow: "hidden" }}>
                            {[
                              { label: "GitHub",   sub: "Zakaria12e",                href: "https://github.com/Zakaria12e",        color: isDark ? "#e8e8e8" : "#1a1a1a" },
                              { label: "LinkedIn", sub: "linkedin.com/in/zakaria",   href: "#",                                    color: "#0a84ff" },
                              { label: "Email",    sub: "hello@zakaria.dev",         href: "mailto:hello@zakaria.dev",             color: "#30d158" },
                            ].map((row, i, arr) => (
                              <a key={row.label} href={row.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${Math.round(sh * 0.028)}px ${Math.round(sw * 0.038)}px`, borderBottom: i < arr.length - 1 ? `0.5px solid ${divClr}` : "none", textDecoration: "none", transition: "background 0.12s", cursor: "pointer" }}
                              >
                                <div>
                                  <div style={{ fontSize: fs(0.028), color: textPrimary, fontWeight: 500, fontFamily: ff }}>{row.label}</div>
                                  <div style={{ fontSize: fs(0.024), color: textSec, fontFamily: ff, marginTop: 1 }}>{row.sub}</div>
                                </div>
                                <svg width={Math.round(sw * 0.028)} height={Math.round(sw * 0.028)} viewBox="0 0 24 24" fill="none" stroke={row.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </>)}

                        {/* ── SYSTEM ── */}
                        {settingsSel === "system" && (<>
                          <div style={{ fontSize: fs(0.036), fontWeight: 700, color: textPrimary, fontFamily: ff }}>System Info</div>

                          {/* Terminal-style neofetch card */}
                          <div style={{ borderRadius: 10, background: isDark ? "#0d0d0f" : "#1a1a1e", border: `0.5px solid rgba(255,255,255,0.08)`, padding: `${Math.round(sh * 0.04)}px ${Math.round(sw * 0.042)}px`, fontFamily: "'SF Mono','Fira Code',monospace", display: "flex", flexDirection: "column", gap: Math.round(sh * 0.015) }}>
                            {[
                              { key: "OS",        val: "Portfolio OS  v2.0",   valColor: "#e8e8e8" },
                              { key: "Shell",     val: "bash 5.2 (zsh-like)",  valColor: "#e8e8e8" },
                              { key: "Host",      val: "zakaria.dev",          valColor: "#0a84ff" },
                              { key: "Uptime",    val: "3+ years coding",      valColor: "#30d158" },
                              { key: "Memory",    val: "React + TS",           valColor: "#ff9f0a" },
                              { key: "CPU",       val: "Node.js runtime",      valColor: "#ff453a" },
                              { key: "GPU",       val: "CSS animations",       valColor: "#bf5af2" },
                              { key: "Packages",  val: "10+ shipped projects", valColor: "#64d2ff" },
                            ].map(row => (
                              <div key={row.key} style={{ display: "flex", gap: Math.round(sw * 0.016), alignItems: "baseline" }}>
                                <span style={{ fontSize: fs(0.024), color: "#5856D6", minWidth: Math.round(sw * 0.13), textAlign: "right", flexShrink: 0 }}>{row.key}</span>
                                <span style={{ fontSize: fs(0.024), color: "rgba(255,255,255,0.3)" }}>:</span>
                                <span style={{ fontSize: fs(0.024), color: row.valColor }}>{row.val}</span>
                              </div>
                            ))}
                            {/* Color palette */}
                            <div style={{ display: "flex", gap: 5, marginTop: Math.round(sh * 0.01) }}>
                              {["#ff453a","#ff9f0a","#ffd60a","#30d158","#64d2ff","#0a84ff","#bf5af2","#ff375f"].map(c => (
                                <div key={c} style={{ width: Math.round(sw * 0.025), height: Math.round(sw * 0.025), borderRadius: 3, background: c }} />
                              ))}
                            </div>
                          </div>

                          {/* Runtime info */}
                          <div style={{ borderRadius: 10, background: cardBg, border: `0.5px solid ${cardBorder}`, overflow: "hidden" }}>
                            {[
                              { k: "Framework",    v: "React 18 + Vite" },
                              { k: "Language",     v: "TypeScript 5" },
                              { k: "Styling",      v: "Tailwind CSS + inline" },
                              { k: "Deployment",   v: "Vercel" },
                              { k: "Version",      v: "2.0.0" },
                            ].map((row, i, arr) => (
                              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${Math.round(sh * 0.022)}px ${Math.round(sw * 0.038)}px`, borderBottom: i < arr.length - 1 ? `0.5px solid ${divClr}` : "none" }}>
                                <span style={{ fontSize: fs(0.027), color: textSec, fontFamily: ff }}>{row.k}</span>
                                <span style={{ fontSize: fs(0.027), color: textPrimary, fontFamily: ff, fontWeight: 500 }}>{row.v}</span>
                              </div>
                            ))}
                          </div>
                        </>)}

                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Terminal — standalone macOS window, same chrome as project windows */}
              {terminalOpen && !termMinimized && (() => {
                const mbH2    = Math.round(h * 0.036)
                const availH2 = h - mbH2
                const tw      = Math.round(w * 0.68)
                const th      = Math.round(availH2 * 0.62)
                const tTop    = mbH2 + Math.round((availH2 - th) * 0.28)
                const tLeft   = Math.round((w - 20 - tw) / 2)
                const winBg   = isDark ? "#1e1e1e" : "#ffffff"
                const termBodyBg = isDark ? "#1e1e1e" : "#ffffff"
                const termText   = isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.82)"
                const termSep    = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"
                const termPath   = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.38)"
                const termCwdEnd = isDark ? "#a78bfa" : "#7c3aed"
                const termPrompt = "#30d158"
                const termPercent = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)"
                const tlSz2   = Math.round(22 * 0.54)
                const tlGap2  = Math.round(22 * 0.45)
                const tlLeft2 = Math.round(22 * 0.64)
                const zIdx    = 3 + (windowOrder.indexOf("terminal") >= 0 ? windowOrder.indexOf("terminal") : windowOrder.length)
                return (
                  <div
                    onClick={() => setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])}
                    style={{
                      position: "absolute",
                      ...(termMaximized
                        ? { top: mbH2, left: 0, right: 0, bottom: 0 }
                        : {
                            width: tw, height: th,
                            top: tTop + termPos.y,
                            left: tLeft + termPos.x,
                          }
                      ),
                      borderRadius: termMaximized ? 0 : 10,
                      background: winBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.4), 0 12px 36px rgba(0,0,0,0.55), 0 32px 80px rgba(0,0,0,0.6)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.07), 0 12px 36px rgba(0,0,0,0.12), 0 32px 80px rgba(0,0,0,0.16)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden", zIndex: zIdx,
                      animation: termMinimizing
                        ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                        : "winIn 0.36s cubic-bezier(0.22,1,0.36,1)",
                      transformOrigin: termOrigin,
                      transition: termDragRef.current ? "none" : "border-radius 0.2s ease",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        if (termMaximized) return
                        e.preventDefault()
                        termDragRef.current = { startX: e.clientX, startY: e.clientY, ox: termPos.x, oy: termPos.y }
                        const onMove = (ev: MouseEvent) => {
                          const drag = termDragRef.current
                          if (!drag) return
                          setTermPos({ x: drag.ox + ev.clientX - drag.startX, y: drag.oy + ev.clientY - drag.startY })
                        }
                        const onUp = () => { termDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{
                        height: 22, flexShrink: 0,
                        background: isDark ? "#2c2c2e" : "#ececec",
                        borderBottom: `0.5px solid ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"}`,
                        display: "flex", alignItems: "center",
                        position: "relative", userSelect: "none",
                        cursor: termMaximized ? "default" : "grab",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap2, paddingLeft: tlLeft2 }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", sym: "×", symClr: "#460804",
                            fn: () => { setTerminalOpen(false); setTermLines([]); setTermInput(""); setTermPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "terminal")) } },
                          { fill: "#f6be50", border: "#e1a73e", sym: "−", symClr: "#90591d",
                            fn: () => { setTermMinimizing(true); setTimeout(() => { setTermMinimized(true); setTermMinimizing(false) }, 340) } },
                          { fill: "#61c555", border: "#2dac2f", sym: "⤢", symClr: "#2a6218",
                            fn: () => { setTermMaximized(m => !m); setTermMinimized(false) } },
                        ].map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); btn.fn() }}
                            onMouseEnter={() => setHoveredTermTl(i)}
                            onMouseLeave={() => setHoveredTermTl(-1)}
                            style={{
                              width: tlSz2, height: tlSz2, borderRadius: "50%",
                              background: btn.fill, border: `0.5px solid ${btn.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", flexShrink: 0,
                            }}
                          >
                            <span style={{
                              fontSize: Math.round(tlSz2 * 0.58), lineHeight: 1, fontWeight: 900,
                              color: btn.symClr, opacity: hoveredTermTl === i ? 1 : 0,
                              transition: "opacity 0.08s", userSelect: "none",
                            }}>{btn.sym}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: Math.round(w * 0.021), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)", letterSpacing: -0.1, fontFamily: "-apple-system,'SF Pro Text',sans-serif" }}>
                          {proj?.title ? `${proj.title} — zsh` : "Terminal — zsh"}
                        </span>
                      </div>
                    </div>
                    {/* Terminal body */}
                    <div
                      ref={termBodyRef}
                      onClick={() => inputRef.current?.focus()}
                      style={{
                        flex: 1, background: termBodyBg,
                        padding: `${Math.round(w * 0.016)}px ${Math.round(w * 0.02)}px`,
                        overflowY: "auto", scrollbarWidth: "none" as const,
                        cursor: "text",
                        fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
                        fontSize: Math.round(w * 0.021), lineHeight: 1.65,
                      }}
                    >
                      {termLines.map((line, i) => (
                        line.parts ? (
                          <div key={i} style={{ paddingBottom: 1 }}>
                            {line.parts.map((p, pi) => (
                              <span key={pi} style={{ color: p.color ?? termText }}>{p.text}</span>
                            ))}
                          </div>
                        ) : line.items ? (
                          <div key={i} style={{ display: "flex", flexWrap: "wrap" as const, gap: Math.round(w * 0.016), padding: `${Math.round(w * 0.008)}px 0 ${Math.round(w * 0.006)}px` }}>
                            {line.items.map((item, j) => (
                              <div key={j} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3, width: Math.round(w * 0.072), cursor: "default" }}>
                                <img
                                  src={item.type === "folder" ? FOLDER_ICON : FILE_ICON}
                                  width={Math.round(w * 0.046)}
                                  height={Math.round(w * 0.046)}
                                  draggable={false}
                                  style={{ objectFit: "contain", display: "block" }}
                                />
                                <span style={{ fontSize: Math.round(w * 0.018), color: termText, textAlign: "center" as const, wordBreak: "break-all" as const, lineHeight: 1.25, maxWidth: "100%" }}>{item.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div key={i} style={{ color: line.color ?? termText, paddingBottom: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" as const }}>
                            {line.text}
                          </div>
                        )
                      ))}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 0 }}>
                        <span style={{ color: termPrompt, fontWeight: 700, marginRight: 4 }}>➜</span>
                        <span style={{ marginRight: 4 }}>
                          {termCwd.split("/").map((seg, si, arr) => (
                            <span key={si}>
                              {si > 0 && <span style={{ color: termSep }}>/</span>}
                              <span style={{ color: si === arr.length - 1 ? termCwdEnd : termPath }}>{seg}</span>
                            </span>
                          ))}
                        </span>
                        <span style={{ color: termPercent, marginRight: 6 }}>%</span>
                        <input
                          ref={inputRef}
                          value={termInput}
                          onChange={e => setTermInput(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            e.stopPropagation()
                            if (e.key === "Enter") { runCommand(termInput, termCwd); return }
                            if (e.key === "Tab") {
                              e.preventDefault()
                              const val = termInput
                              if (val.startsWith("cd ")) {
                                const partial = val.slice(3)
                                const dirs = getDirs(termCwd, allProjectSlugs, termFsRef.current)
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
                            color: termText, fontSize: "inherit", fontFamily: "inherit",
                            caretColor: termPrompt, minWidth: 10,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
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

              {/* Safari Window */}
              {safariOpen && !safariMinimized && (() => {
                const mbH   = Math.round(h * 0.036)
                const sw2   = Math.round(w * 0.9)
                const sh2   = Math.round(h * 0.82)
                const baseTop  = mbH + Math.round((h - mbH - sh2) * 0.1)
                const screenW2 = w - 20
                const baseLeft = Math.round((screenW2 - sw2) / 2)
                const tlSz  = Math.round(22 * 0.54)
                const tlGap = Math.round(22 * 0.45)
                const tlLeft = Math.round(22 * 0.64)
                const toolbarH = Math.round(sh2 * 0.068)
                const tabH     = Math.round(sh2 * 0.042)
                const bg    = isDark ? "#3a3a3c" : "#f5f5f7"
                const toolBg = isDark ? "#2c2c2e" : "#e8e8ea"
                const inputBg = isDark ? "#1c1c1e" : "#ffffff"
                const divClr  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"
                const textPrimary = isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.85)"
                const textSec     = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)"
                const ff = "-apple-system,'SF Pro Text',BlinkMacSystemFont,sans-serif"
                const fs = (n: number) => Math.round(sw2 * n)
                const navigate = (raw: string) => {
                  let url = raw.trim()
                  if (!url) return
                  if (!/^https?:\/\//i.test(url)) url = "https://" + url
                  setSafariUrl(url)
                  setSafariInput(url)
                }
                return (
                  <div
                    onClick={e => { e.stopPropagation(); bringToFront("safari"); setFocusedWinId(null) }}
                    style={{
                      position: "absolute",
                      ...(safariMaximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : { top: baseTop + safariPos.y, left: baseLeft + safariPos.x, width: sw2, height: sh2 }
                      ),
                      borderRadius: safariMaximized ? 0 : 10,
                      background: bg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.7), 0 32px 80px rgba(0,0,0,0.6)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.14), 0 32px 80px rgba(0,0,0,0.12)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: 3 + (windowOrder.indexOf("safari") >= 0 ? windowOrder.indexOf("safari") : 0),
                      animation: safariMinimizing
                        ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                        : "winIn 0.32s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar + URL bar */}
                    <div
                      onMouseDown={e => {
                        if (safariMaximized) return
                        e.preventDefault()
                        safariDragRef.current = { startX: e.clientX, startY: e.clientY, ox: safariPos.x, oy: safariPos.y }
                        const onMove = (ev: MouseEvent) => {
                          const d = safariDragRef.current; if (!d) return
                          setSafariPos({ x: d.ox + ev.clientX - d.startX, y: d.oy + ev.clientY - d.startY })
                        }
                        const onUp = () => { safariDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                        window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: toolbarH, flexShrink: 0, background: toolBg, borderBottom: `0.5px solid ${divClr}`, display: "flex", alignItems: "center", gap: Math.round(sw2 * 0.01), paddingRight: Math.round(sw2 * 0.015), userSelect: "none", cursor: "grab" }}
                    >
                      {/* Traffic lights */}
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap, paddingLeft: tlLeft, flexShrink: 0 }}
                        onMouseEnter={() => setSafariHoveredTl(0)}
                        onMouseLeave={() => setSafariHoveredTl(-1)}
                      >
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", sym: "×", fn: () => { setSafariOpen(false); setSafariMinimized(false); setSafariMaximized(false); setSafariPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "safari")) } },
                          { fill: "#f6be50", border: "#e1a73e", sym: "−", fn: () => { setSafariMinimizing(true); setTimeout(() => { setSafariMinimized(true); setSafariMinimizing(false) }, 340) } },
                          { fill: "#61c555", border: "#2dac2f", sym: "⤢", fn: () => { setSafariMaximized(m => !m); setSafariMinimized(false) } },
                        ].map((btn, i) => (
                          <div key={i} onClick={e => { e.stopPropagation(); btn.fn() }}
                            style={{ width: tlSz, height: tlSz, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: tlSz * 0.72, color: "rgba(0,0,0,0.55)", lineHeight: 1, fontWeight: 700, opacity: safariHoveredTl >= 0 ? 1 : 0, transition: "opacity 0.1s" }}>{btn.sym}</span>
                          </div>
                        ))}
                      </div>
                      {/* Back / Forward */}
                      <div style={{ display: "flex", gap: 2, marginLeft: Math.round(sw2 * 0.01), flexShrink: 0 }}>
                        {["‹", "›"].map((ch, i) => (
                          <div key={i} style={{ width: Math.round(sw2 * 0.032), height: Math.round(sw2 * 0.032), display: "flex", alignItems: "center", justifyContent: "center", borderRadius: Math.round(sw2 * 0.008), background: "transparent", cursor: "default", color: textSec, fontSize: Math.round(sw2 * 0.028), fontWeight: 300, fontFamily: ff }}>{ch}</div>
                        ))}
                      </div>
                      {/* URL bar */}
                      <div style={{ flex: 1, height: Math.round(toolbarH * 0.52), background: inputBg, borderRadius: Math.round(toolbarH * 0.28), display: "flex", alignItems: "center", paddingLeft: Math.round(sw2 * 0.012), paddingRight: Math.round(sw2 * 0.008), gap: Math.round(sw2 * 0.006), border: `0.5px solid ${divClr}` }}>
                        <svg width={Math.round(sw2 * 0.014)} height={Math.round(sw2 * 0.014)} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill={textSec as string} />
                        </svg>
                        <input
                          value={safariInput}
                          onChange={e => setSafariInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") navigate(safariInput) }}
                          onFocus={e => e.target.select()}
                          onClick={e => e.stopPropagation()}
                          placeholder="Search or enter website name"
                          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: Math.round(sw2 * 0.016), fontFamily: ff, color: textPrimary as string, caretColor: "#0a84ff" }}
                        />
                        {safariInput && (
                          <div onClick={e => { e.stopPropagation(); setSafariInput("") }} style={{ cursor: "pointer", color: textSec as string, fontSize: Math.round(sw2 * 0.018), lineHeight: 1 }}>×</div>
                        )}
                      </div>
                      {/* Share button */}
                      <div style={{ width: Math.round(sw2 * 0.034), height: Math.round(sw2 * 0.034), display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", flexShrink: 0 }}>
                        <svg width={Math.round(sw2 * 0.022)} height={Math.round(sw2 * 0.022)} viewBox="0 0 24 24" fill="none">
                          <path d="M12 2v12M8 6l4-4 4 4M4 16v4h16v-4" stroke={textSec as string} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    {/* Tab bar */}
                    <div style={{ height: tabH, flexShrink: 0, background: toolBg, borderBottom: `0.5px solid ${divClr}`, display: "flex", alignItems: "center", paddingLeft: Math.round(sw2 * 0.012), gap: Math.round(sw2 * 0.008) }}>
                      <div style={{ height: Math.round(tabH * 0.72), paddingLeft: Math.round(sw2 * 0.012), paddingRight: Math.round(sw2 * 0.012), background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)", borderRadius: Math.round(tabH * 0.28), display: "flex", alignItems: "center", gap: Math.round(sw2 * 0.008), minWidth: Math.round(sw2 * 0.16), maxWidth: Math.round(sw2 * 0.25), border: `0.5px solid ${divClr}` }}>
                        <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp" style={{ width: Math.round(tabH * 0.38), height: Math.round(tabH * 0.38), borderRadius: 2 }} draggable={false} />
                        <span style={{ fontSize: fs(0.014), fontFamily: ff, color: textPrimary as string, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{safariUrl ? (() => { try { return new URL(safariUrl.startsWith("http") ? safariUrl : "https://" + safariUrl).hostname } catch { return safariUrl } })() : "New Tab"}</span>
                        <span style={{ fontSize: fs(0.014), color: textSec as string, cursor: "pointer" }} onClick={e => { e.stopPropagation(); setSafariOpen(false); setWindowOrder(o => o.filter(k => k !== "safari")) }}>×</span>
                      </div>
                      <div style={{ width: Math.round(tabH * 0.65), height: Math.round(tabH * 0.65), display: "flex", alignItems: "center", justifyContent: "center", color: textSec as string, cursor: "pointer", fontSize: fs(0.018), borderRadius: 4 }}>+</div>
                    </div>

                    {/* Content area */}
                    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: isDark ? "#3a3a3c" : "#ffffff" }}>
                      {safariUrl ? (
                        <iframe
                          key={safariUrl}
                          src={safariUrl}
                          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          title="Safari"
                        />
                      ) : (
                        /* Start page */
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: Math.round(sh2 * 0.12), gap: Math.round(sh2 * 0.032), background: isDark ? "#3a3a3c" : "#ffffff", overflow: "auto" }}>
                          {/* Safari compass icon */}
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp" style={{ width: Math.round(sw2 * 0.072), height: Math.round(sw2 * 0.072) }} draggable={false} />
                          <div style={{ fontSize: fs(0.028), fontWeight: 600, fontFamily: ff, color: textPrimary as string }}>Start Page</div>
                          {/* Favorites */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: Math.round(sw2 * 0.018), width: Math.round(sw2 * 0.72) }}>
                            {[
                              { label: "GitHub", url: "https://github.com", color: "#24292e", icon: "G" },
                              { label: "Google", url: "https://google.com", color: "#4285f4", icon: "G" },
                              { label: "YouTube", url: "https://youtube.com", color: "#ff0000", icon: "▶" },
                              { label: "MDN", url: "https://developer.mozilla.org", color: "#0065a2", icon: "M" },
                              { label: "Vercel", url: "https://vercel.com", color: "#000", icon: "▲" },
                              { label: "NPM", url: "https://npmjs.com", color: "#cb3837", icon: "N" },
                              { label: "Tailwind", url: "https://tailwindcss.com", color: "#38bdf8", icon: "T" },
                              { label: "TypeScript", url: "https://typescriptlang.org", color: "#3178c6", icon: "TS" },
                            ].map(fav => (
                              <div key={fav.label} onClick={() => navigate(fav.url)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(sh2 * 0.014), cursor: "pointer" }}>
                                <div style={{ width: Math.round(sw2 * 0.065), height: Math.round(sw2 * 0.065), borderRadius: Math.round(sw2 * 0.014), background: fav.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs(0.022), fontWeight: 700, color: "#fff", fontFamily: ff, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>{fav.icon}</div>
                                <span style={{ fontSize: fs(0.014), fontFamily: ff, color: textSec as string }}>{fav.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

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
                    data-dock
                    onMouseMove={(e) => { computeTargets(e.clientX) }}
                    onMouseLeave={resetTargets}
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: ICON_GAP,
                      paddingLeft: DOCK_PAD_X,
                      paddingRight: DOCK_PAD_X,
                      paddingTop: DOCK_PAD_Y,
                      paddingBottom: DOCK_PAD_Y,
                      background: isDark ? "rgba(30,30,32,0.55)" : "rgba(255,255,255,0.28)",
                      backdropFilter: "blur(28px) saturate(1.8)",
                      WebkitBackdropFilter: "blur(28px) saturate(1.8)",
                      borderRadius: Math.round(ICON_BASE * 0.48),
                      border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "none",
                      boxShadow: isDark
                        ? "0 4px 24px rgba(0,0,0,0.5)"
                        : "0 4px 20px rgba(0,0,0,0.1)",
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
                      <img
                        src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429910/128_vv8kbl.png"
                        alt="Finder"
                        draggable={false}
                        style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scales[0] ?? 1})`, transformOrigin: "bottom center", willChange: "transform" }}
                      />
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
                            const existing = openWindows.find(w => w.projectIdx === idx)
                            if (existing && !existing.minimized && existing.id === focusedWinId) {
                              updateWin(existing.id, { minimizing: true })
                              setTimeout(() => updateWin(existing.id, { minimized: true, minimizing: false }), 340)
                            } else {
                              openWindow(idx)
                            }
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
                          {thumb
                            ? <img src={thumb} alt={p.title ?? `project ${idx + 1}`} draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform" }} />
                            : <div style={{ width: slotSize, height: slotSize, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform", borderRadius: Math.round(slotSize * 0.22), flexShrink: 0, background: ["linear-gradient(135deg,#1A88FE,#0055D4)","linear-gradient(135deg,#34C759,#248A3D)","linear-gradient(135deg,#FF3B30,#C0001A)","linear-gradient(135deg,#FF9500,#C65900)","linear-gradient(135deg,#AF52DE,#7026B9)","linear-gradient(135deg,#5856D6,#3634A3)","linear-gradient(135deg,#32ADE6,#007AFF)","linear-gradient(135deg,#FF2D55,#D60034)"][idx % 8] }} />
                          }
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
                          const isOnTop = windowOrder[windowOrder.length - 1] === "terminal"
                          if (!terminalOpen || termMinimized) {
                            setTermMinimized(false); setTermMinimizing(false)
                            setTermOrigin(getOrigin(e)); setTerminalOpen(true)
                            setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
                            setTimeout(() => inputRef.current?.focus(), 50)
                          } else if (isOnTop) {
                            setTermMinimizing(true)
                            setTimeout(() => { setTermMinimized(true); setTermMinimizing(false) }, 340)
                          } else {
                            setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
                            setTimeout(() => inputRef.current?.focus(), 50)
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
                        <img
                          src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424797/256_uzh1yj.png"
                          draggable={false}
                          style={{
                            width: slotSize, height: slotSize,
                            transform: `scale(${scales[dockCount + 1] ?? 1})`,
                            transformOrigin: "bottom center",
                            willChange: "transform",
                            flexShrink: 0,
                            objectFit: "contain",
                            display: "block",
                            animation: termMinimized ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined,
                          }}
                        />
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
                        <img
                          src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429614/128_xyfst7.png"
                          alt="GitHub"
                          draggable={false}
                          style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scales[dockCount + 1 + (showTerminalIcon ? 1 : 0)] ?? 1})`, transformOrigin: "bottom center", willChange: "transform" }}
                        />
                      </div>
                    </>}

                    {/* VSCode icon */}
                    {(() => {
                      const vscodeRefIdx = dockCount + 1 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0)
                      const scale = scales[vscodeRefIdx] ?? 1
                      return (
                        <div
                          ref={(el) => { iconRefs.current[vscodeRefIdx] = el }}
                          onMouseEnter={() => setHoveredSlot("vscode")}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{ width: slotSize, height: slotSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "visible", position: "relative" }}
                          onClick={e => { e.stopPropagation() }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: "rgba(28,28,30,0.92)", backdropFilter: "blur(10px)", borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "vscode" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>Visual Studio Code</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429665/128_na5mv8.webp" alt="VSCode" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform" }} />
                        </div>
                      )
                    })()}

                    {/* Messages icon */}
                    {(() => {
                      const messagesRefIdx = dockCount + 2 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0)
                      const scale = scales[messagesRefIdx] ?? 1
                      return (
                        <div
                          ref={(el) => { iconRefs.current[messagesRefIdx] = el }}
                          onMouseEnter={() => setHoveredSlot("messages")}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{ width: slotSize, height: slotSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "visible", position: "relative" }}
                          onClick={e => { e.stopPropagation() }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: "rgba(28,28,30,0.92)", backdropFilter: "blur(10px)", borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "messages" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>Messages</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429715/128_cdh305.webp" alt="Messages" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform" }} />
                        </div>
                      )
                    })()}

                    {/* Safari icon */}
                    {(() => {
                      const safariRefIdx = dockCount + 3 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0)
                      const scale = scales[safariRefIdx] ?? 1
                      return (
                        <div
                          ref={(el) => { iconRefs.current[safariRefIdx] = el }}
                          onMouseEnter={() => setHoveredSlot("safari")}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{ width: slotSize, height: slotSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "visible", position: "relative" }}
                          onClick={e => {
                            e.stopPropagation()
                            const isOnTop = windowOrder[windowOrder.length - 1] === "safari"
                            if (!safariOpen || safariMinimized) {
                              setSafariMinimized(false); setSafariMinimizing(false); setSafariOpen(true)
                              setWindowOrder(o => [...o.filter(k => k !== "safari"), "safari"])
                            } else if (isOnTop) {
                              setSafariMinimizing(true)
                              setTimeout(() => { setSafariMinimized(true); setSafariMinimizing(false) }, 340)
                            } else {
                              setWindowOrder(o => [...o.filter(k => k !== "safari"), "safari"])
                            }
                          }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: "rgba(28,28,30,0.92)", backdropFilter: "blur(10px)", borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "safari" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>Safari</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp" alt="Safari" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform" }} />
                          <div style={{ position: "absolute", bottom: -(DOCK_PAD_Y + 1), left: "50%", transform: "translateX(-50%)", width: 2.5, height: 2.5, borderRadius: "50%", background: safariOpen ? "rgba(255,255,255,0.9)" : "transparent", transition: "background 0.2s", pointerEvents: "none" }} />
                        </div>
                      )
                    })()}

                    {/* Settings icon */}
                    {(() => {
                      const settingsRefIdx = dockCount + 4 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0)
                      const scale = scales[settingsRefIdx] ?? 1
                      return (
                        <div
                          ref={(el) => { iconRefs.current[settingsRefIdx] = el }}
                          onMouseEnter={() => setHoveredSlot("settings")}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{ width: slotSize, height: slotSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "visible", position: "relative" }}
                          onClick={e => {
                            e.stopPropagation()
                            if (settingsOpen && settingsMinimized) {
                              setSettingsMinimized(false); bringToFront("settings")
                            } else {
                              setSettingsOpen(o => { if (!o) setWindowOrder(ord => [...ord.filter(k => k !== "settings"), "settings"]); else setWindowOrder(ord => ord.filter(k => k !== "settings")); return !o })
                            }
                          }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: "rgba(28,28,30,0.92)", backdropFilter: "blur(10px)", borderRadius: 5, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "settings" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>System Settings</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429984/256_bumw1c.png" alt="Settings" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform" }} />
                          <div style={{ position: "absolute", bottom: -(DOCK_PAD_Y + 1), left: "50%", transform: "translateX(-50%)", width: 2.5, height: 2.5, borderRadius: "50%", background: settingsOpen ? "rgba(255,255,255,0.9)" : "transparent", transition: "background 0.2s", pointerEvents: "none" }} />
                        </div>
                      )
                    })()}
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
        [data-mac-screen] [style*="cursor: pointer"],
        [data-mac-screen] *[style*="cursor:pointer"] {
          cursor: url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424539/link-select_omlszb.svg") 6 0, pointer !important;
        }
        [data-dock], [data-dock] * {
          cursor: url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424556/normal-select_ihp9on.svg") 1 1, default !important;
        }
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
        @keyframes ccIn {
          0%   { opacity: 0; transform: scale(0.96) translateY(-6px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  )
}
