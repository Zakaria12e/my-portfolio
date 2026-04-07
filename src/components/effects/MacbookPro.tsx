"use client"

import { useState, useEffect, useRef, useCallback, useMemo, CSSProperties } from "react"
import { Camera, ChevronLeft, Info, Mic, PencilLine, Plus, Search, Send, Smile, Video } from "lucide-react"
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
const MESSAGE_CONVERSATION: MessageConversation = {
  id: 1,
  name: "Zakaria",
  color: "from-blue-500 to-cyan-400",
  online: true,
  messages: [
    { id: 1, fromMe: false, text: "This is the Messages window UI inside the MacBook.", time: "09:12" },
    { id: 2, fromMe: true, text: "Clean. Glassy. macOS-like. Exactly what I wanted.", time: "09:13" },
    { id: 3, fromMe: false, text: "Single conversation only, with your profile as the contact.", time: "09:14" },
    { id: 4, fromMe: true, text: "Good. Keep it minimal and sharp.", time: "09:15" },
  ],
}

interface WinState {
  id: number
  projectIdx: number
  pos: { x: number; y: number }
  size: { w: number; h: number }
  maximized: boolean
  minimized: boolean
  minimizing: boolean
  hoveredTl: number
  activeImg: number
}

type MacWindowKey =
  | number
  | "finder"
  | "terminal"
  | "messages"
  | "safari"
  | "itunes"
  | `folder:${number}`
  | `file:${number}`

type SwitchableKey = MacWindowKey
type SwitchableItem = {
  key: SwitchableKey
  label: string
  icon: string | null
  tone: string
}

type MessageBubble = {
  id: number
  fromMe: boolean
  text: string
  time: string
}

type MessageConversation = {
  id: number
  name: string
  color: string
  online: boolean
  messages: MessageBubble[]
}

type DesktopItem = {
  id: number
  name: string
  type: "folder" | "file"
  slot: number
  dx: number
  dy: number
  selected: boolean
  locked?: boolean
  path?: string
}

function TrafficLightSymbol({
  kind,
  color,
  size,
  visible,
}: {
  kind: "close" | "minimize" | "maximize"
  color: string
  size: number
  visible: boolean
}) {
  const strokeWidth = kind === "maximize" ? 1.75 : 1.9

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        transition: "opacity 0.1s",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {kind === "close" && (
        <>
          <path d="M4.4 4.4 9.6 9.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M9.6 4.4 4.4 9.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}
      {kind === "minimize" && (
        <path d="M4.1 7h5.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {kind === "maximize" && (
        <>
          <path d="M4.2 9.8 9.8 4.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M7.9 4.2h1.9v1.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M6.1 9.8H4.2V7.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </svg>
  )
}

function ResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 18,
        height: 18,
        cursor: "nwse-resize",
        zIndex: 30,
      }}
    />
  )
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
type TermLine = {
  text?: string
  color?: string
  items?: FsEntry[]
  parts?: { text: string; color?: string }[]
  helpSection?: string
  helpRow?: { cmd: string; args: string; desc: string }
}

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
  const [windowOrder, setWindowOrder] = useState<MacWindowKey[]>([])
  const winIdRef = useRef(0)
  const winDragRef = useRef<{ winId: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const openWindowsRef = useRef<WinState[]>([])
  const [quickLookOpen, setQuickLookOpen] = useState(false)
  const [quickLookIdx, setQuickLookIdx] = useState(0)
  const [quickLookMax, setQuickLookMax] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [macKeyboardActive, setMacKeyboardActive] = useState(false)
  const [qShortcutHeld, setQShortcutHeld] = useState(false)
  const [appSwitcherVisible, setAppSwitcherVisible] = useState(false)
  const [appSwitcherIndex, setAppSwitcherIndex] = useState(0)
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
  const [termSize, setTermSize] = useState({ w: 0, h: 0 })
  const [hoveredTermTl, setHoveredTermTl] = useState(-1)
  const termDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const [itunesOpen, setItunesOpen] = useState(false)
  const [itunesMinimized, setItunesMinimized] = useState(false)
  const WALLPAPERS = [
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775391427/macbg2_lpqquf.avif",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775348567/wp8030357_ctm5ix.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775391444/macbg3_xg9uh1.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775561044/macwallpaper_ubycpy.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775561859/dreamy-lines_upvr7l.jpg",
  ]
  const SAFARI_WALLPAPERS = [
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775590602/desert-5_oqfab8.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775592418/61_jbqwtk.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775592591/natural-evening_qecm77.avif",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775391427/macbg2_lpqquf.avif",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775348567/wp8030357_ctm5ix.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775391444/macbg3_xg9uh1.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775561044/macwallpaper_ubycpy.jpg",
    "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775561859/dreamy-lines_upvr7l.jpg",
  ]
  const SAFARI_FAVORITES = [
    { label: "Apple", url: "https://apple.com" },
    { label: "Behance", url: "https://behance.net" },
    { label: "Twitter", url: "https://x.com" },
    { label: "WeTransfer", url: "https://wetransfer.com" },
    { label: "Yelp", url: "https://yelp.com" },
    { label: "Design Milk", url: "https://design-milk.com" },
    { label: "Architect", url: "https://architecturaldigest.com" },
  ]
  const [wallpaper, setWallpaper] = useState(WALLPAPERS[0])
  const [safariWallpaper, setSafariWallpaper] = useState(SAFARI_WALLPAPERS[0])
  const [hoveredSafariFavorite, setHoveredSafariFavorite] = useState<number | null>(null)
  const [pressedSafariFavorite, setPressedSafariFavorite] = useState<number | null>(null)
  const [prevWallpaper, setPrevWallpaper] = useState<string | null>(null)
  const [wallpaperTransitioning, setWallpaperTransitioning] = useState(false)
  const [finderOpen, setFinderOpen] = useState(false)
  const [finderMinimized, setFinderMinimized] = useState(false)
  const [finderMinimizing, setFinderMinimizing] = useState(false)
  const [finderMaximized, setFinderMaximized] = useState(false)
  const [finderPos, setFinderPos] = useState({ x: 0, y: 0 })
  const [finderSize, setFinderSize] = useState({ w: 0, h: 0 })
  const [hoveredFinderTl, setHoveredFinderTl] = useState(-1)
  const [finderSel, setFinderSel] = useState<string | null>(null)
  const [finderSidebarSel, setFinderSidebarSel] = useState("project")
  const [termInput, setTermInput] = useState("")
  const [termCwd, setTermCwd] = useState("~")
  const [termLines, setTermLines] = useState<TermLine[]>([])
  const [termFs, setTermFs] = useState<TermFs>({})
  const termFsRef = useRef<TermFs>({})
  const [desktopItems, setDesktopItems] = useState<DesktopItem[]>([
    { id: 0, name: "Projects", type: "folder", slot: 0, dx: 0, dy: 0, selected: false, locked: true, path: "~/projects" },
    { id: 1, name: "shortcuts", type: "file", slot: 1, dx: 0, dy: 0, selected: false, locked: true, path: "~/shortcuts" },
  ])
  const desktopItemsRef = useRef<DesktopItem[]>([])
  const desktopItemIdRef = useRef(2)
  const desktopDragRef   = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const desktopClickRef  = useRef<{ id: number; time: number }>({ id: -1, time: 0 })
  const [folderWins, setFolderWins] = useState<{ id: number; name: string; path: string; pos: { x: number; y: number }; size: { w: number; h: number }; maximized: boolean; minimized: boolean; minimizing: boolean; hoveredTl: number }[]>([])
  const folderWinIdRef  = useRef(0)
  const folderWinDragRef = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const finderDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const itemClickRef     = useRef<{ path: string; time: number }>({ path: "", time: 0 })
  const [fileContents, setFileContents] = useState<Record<string, string>>({
    "~/shortcuts": [
      "Mac Mockup Shortcuts",
      "",
      "Click anywhere inside the Mac mockup first to focus it.",
      "",
      "Global",
      "- Q + Tab: open the Mac app switcher and move forward",
      "- Ctrl + Q or Cmd + Q: close the topmost open Mac window",
      "- Ctrl + Enter or Cmd + Enter: open or toggle Terminal",
      "- Escape: close Terminal, close Finder, and exit Quick Look",
    ].join("\n"),
  })
  const [fileEditorWins, setFileEditorWins] = useState<{ id: number; name: string; path: string; pos: { x: number; y: number }; size: { w: number; h: number }; maximized: boolean; minimized: boolean; minimizing: boolean; hoveredTl: number }[]>([])
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
  const [safariSize, setSafariSize] = useState({ w: 0, h: 0 })
  const [safariTabs, setSafariTabs] = useState<{ id: number; url: string; history: string[]; historyIndex: number }[]>([{ id: 1, url: "", history: [""], historyIndex: 0 }])
  const [activeSafariTabId, setActiveSafariTabId] = useState(1)
  const [safariInput, setSafariInput] = useState("")
  const [safariInputFocused, setSafariInputFocused] = useState(false)
  const [safariHoveredTl, setSafariHoveredTl] = useState(-1)
  const [safariSettingsPanelOpen, setSafariSettingsPanelOpen] = useState(false)
  const safariDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const safariTabIdRef = useRef(1)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [messagesMinimized, setMessagesMinimized] = useState(false)
  const [messagesMinimizing, setMessagesMinimizing] = useState(false)
  const [messagesMaximized, setMessagesMaximized] = useState(false)
  const [messagesPos, setMessagesPos] = useState({ x: 0, y: 0 })
  const [messagesSize, setMessagesSize] = useState({ w: 0, h: 0 })
  const [hoveredMessagesTl, setHoveredMessagesTl] = useState(-1)
  const messagesDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const messagesBodyRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(3)
  const [dockBounceKeys, setDockBounceKeys] = useState<Record<string, boolean>>({})
  const dockBounceTimersRef = useRef<Record<string, number>>({})
  const [scales, setScales] = useState<number[]>([])
  const [termOrigin, setTermOrigin]   = useState("50% 100%")
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [dockPeek, setDockPeek] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: number | null } | null>(null)
  const [contextMenuHovered, setContextMenuHovered] = useState<number | null>(null)
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number
    y: number
    winId: number
    path: string
    targetName: string | null
    targetType: "folder" | "file" | null
    mutable: boolean
  } | null>(null)
  const [folderContextMenuHovered, setFolderContextMenuHovered] = useState<number | null>(null)
  const [editingFolderItem, setEditingFolderItem] = useState<{
    winId: number
    path: string
    originalName: string
    type: "folder" | "file"
  } | null>(null)
  const [editingFolderName, setEditingFolderName] = useState("")
  const [editingDesktopItemId, setEditingDesktopItemId] = useState<number | null>(null)
  const [editingDesktopName, setEditingDesktopName] = useState("")
  const macRef      = useRef<HTMLDivElement>(null)
  const screenRef   = useRef<HTMLDivElement>(null)
  const dockRef     = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const safariInputRef = useRef<HTMLInputElement>(null)
  const desktopRenameInputRef = useRef<HTMLInputElement>(null)
  const folderRenameInputRef = useRef<HTMLInputElement>(null)
  const termBodyRef = useRef<HTMLDivElement>(null)
  const iconRefs    = useRef<(HTMLDivElement | null)[]>([])
  const vscodeAudioRef = useRef<HTMLAudioElement | null>(null)
  const focusedDockIdxRef = useRef(-1)
  const arrowResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetScales = useRef<number[]>([])
  const currentScales = useRef<number[]>([])
  const { theme } = useTheme()
  const globalDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const [macDark, setMacDark] = useState(() => globalDark)
  const isDark = macDark

  // Keep openWindowsRef in sync for use in callbacks without stale closures
  openWindowsRef.current = openWindows
  termFsRef.current = termFs
  desktopItemsRef.current = desktopItems

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
  const folderOrderKey = useCallback((id: number) => `folder:${id}` as const, [])
  const fileOrderKey = useCallback((id: number) => `file:${id}` as const, [])
  const [messagesSearch, setMessagesSearch] = useState("")
  const [messagesDraft, setMessagesDraft] = useState("")
  const [messagesConversation, setMessagesConversation] = useState<MessageConversation>(MESSAGE_CONVERSATION)
  const switchableWindows = useMemo<SwitchableItem[]>(() => {
    const entries: SwitchableItem[] = windowOrder.flatMap<SwitchableItem>((key) => {
      if (typeof key === "string" && key.startsWith("folder:")) {
        const id = Number(key.slice(7))
        const win = folderWins.find(w => w.id === id)
        return win && !win.minimized ? [{ key, label: win.name, icon: FOLDER_ICON, tone: "#60a5fa" }] : []
      }
      if (typeof key === "string" && key.startsWith("file:")) {
        const id = Number(key.slice(5))
        const win = fileEditorWins.find(w => w.id === id)
        return win && !win.minimized ? [{ key, label: win.name, icon: FILE_ICON, tone: "#94a3b8" }] : []
      }
      if (key === "finder") {
        return finderOpen && !finderMinimized
          ? [{ key, label: "Finder", icon: "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429274/128_u1g2xr.webp", tone: "#60a5fa" }]
          : []
      }
      if (key === "terminal") {
        return terminalOpen && !termMinimized
          ? [{ key, label: "Terminal", icon: "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424797/256_uzh1yj.png", tone: "#111827" }]
          : []
      }
      if (key === "messages") {
        return messagesOpen && !messagesMinimized
          ? [{ key, label: "Messages", icon: "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429715/128_cdh305.webp", tone: "#22c55e" }]
          : []
      }
      if (key === "safari") {
        return safariOpen && !safariMinimized
          ? [{ key, label: "Safari", icon: "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp", tone: "#0ea5e9" }]
          : []
      }
      if (key === "itunes") {
        return itunesOpen && !itunesMinimized
          ? [{ key, label: "iTunes", icon: "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775430130/128_kdl9gm.webp", tone: "#f472b6" }]
          : []
      }
      const win = openWindows.find(w => w.id === key && !w.minimized)
      if (!win) return []
      const project = projects?.[win.projectIdx]
      return [{
        key,
        label: project?.title ?? "Project",
        icon: project?.iconDark || project?.icon || null,
        tone: "#8b5cf6",
      }]
    })
    return entries
  }, [windowOrder, folderWins, fileEditorWins, finderOpen, finderMinimized, terminalOpen, termMinimized, messagesOpen, messagesMinimized, safariOpen, safariMinimized, itunesOpen, itunesMinimized, openWindows, projects])
  const hasFullscreenWindow =
    openWindows.some(w => w.maximized && !w.minimized) ||
    (terminalOpen && termMaximized && !termMinimized) ||
    (safariOpen && safariMaximized && !safariMinimized) ||
    (messagesOpen && messagesMaximized && !messagesMinimized) ||
    (finderOpen && finderMaximized && !finderMinimized)

  const dockForcedSleep = hasFullscreenWindow
  const hasBlockingWindowOpen =
    openWindows.some(win => !win.minimized) ||
    (finderOpen && !finderMinimized) ||
    (terminalOpen && !termMinimized) ||
    (safariOpen && !safariMinimized) ||
    (messagesOpen && !messagesMinimized) ||
    (itunesOpen && !itunesMinimized) ||
    folderWins.some(win => !win.minimized) ||
    fileEditorWins.some(win => !win.minimized)

  const dockSleeping = dockForcedSleep

  useEffect(() => {
    if (hasFullscreenWindow) setControlCenterOpen(false)
  }, [hasFullscreenWindow])

  useEffect(() => {
    if (dockForcedSleep) setDockPeek(false)
  }, [dockForcedSleep])

  useEffect(() => {
    if (!hovered) {
      setMacKeyboardActive(false)
      setQShortcutHeld(false)
      setAppSwitcherVisible(false)
      setAppSwitcherIndex(0)
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

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!macRef.current?.contains(e.target as Node)) {
        setMacKeyboardActive(false)
        setQShortcutHeld(false)
        setAppSwitcherVisible(false)
        setAppSwitcherIndex(0)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

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
  // -- scroll-based wake/sleep ------------------------------------------------
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

  // -- multi-window helpers ---------------------------------------------------
  const updateWin = useCallback((id: number, patch: Partial<WinState>) => {
    setOpenWindows(ws => ws.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const bringToFront = useCallback((key: MacWindowKey) => {
    setControlCenterOpen(false)
    setWindowOrder(o => [...o.filter(k => k !== key), key])
  }, [])

  const shouldSnapWindowToTop = useCallback((clientY: number) => {
    const rect = screenRef.current?.getBoundingClientRect()
    if (!rect) return false
    return clientY <= rect.top + 18
  }, [])

  const focusWin = useCallback((id: number) => {
    setControlCenterOpen(false)
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
    const localH = Math.round(width * 0.609)
    const mbH = Math.round(localH * 0.036)
    const availH = localH - mbH
    setOpenWindows(ws => [...ws, {
      id, projectIdx,
      pos: { x: cascadeN * 24, y: cascadeN * 24 },
      size: { w: Math.round(width * 0.88), h: Math.round(availH * 0.8) },
      maximized: false, minimized: false, minimizing: false,
      hoveredTl: -1, activeImg: 0,
    }])
    setFocusedWinId(id)
    setWindowOrder(o => [...o.filter(k => k !== id), id])
  }, [width])

  const triggerDockBounce = useCallback((key: string) => {
    const activeTimer = dockBounceTimersRef.current[key]
    if (activeTimer) window.clearTimeout(activeTimer)
    setDockBounceKeys(prev => ({ ...prev, [key]: false }))
    window.requestAnimationFrame(() => {
      setDockBounceKeys(prev => ({ ...prev, [key]: true }))
      dockBounceTimersRef.current[key] = window.setTimeout(() => {
        setDockBounceKeys(prev => ({ ...prev, [key]: false }))
        delete dockBounceTimersRef.current[key]
      }, 720)
    })
  }, [])

  useEffect(() => {
    return () => {
      Object.values(dockBounceTimersRef.current).forEach(timerId => window.clearTimeout(timerId))
    }
  }, [])

  const openSafariUrl = useCallback((raw: string) => {
    let url = raw.trim()
    if (!url || url === "#") return
    if (!/^https?:\/\//i.test(url)) url = "https://" + url
    setSafariTabs(tabs => tabs.map(tab => {
      if (tab.id !== activeSafariTabId) return tab
      const currentUrl = tab.history[tab.historyIndex] ?? tab.url
      if (currentUrl === url) return { ...tab, url }
      const nextHistory = [...tab.history.slice(0, tab.historyIndex + 1), url]
      return {
        ...tab,
        url,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      }
    }))
    setSafariInput(url)
    setSafariMinimized(false)
    setSafariMinimizing(false)
    setSafariInputFocused(false)
    setSafariOpen(true)
    setWindowOrder(o => [...o.filter(k => k !== "safari"), "safari"])
  }, [activeSafariTabId])

  const createDesktopEntry = useCallback((type: "folder" | "file", requestedName?: string) => {
    const fallbackName = type === "folder" ? "New Folder" : "New File.txt"
    const initialName = (requestedName?.trim() || fallbackName).replace(/[\\/:*?"<>|]/g, "").trim() || fallbackName
    const existingNames = new Set(desktopItems.map(item => item.name.toLowerCase()))
    let candidate = initialName
    let suffix = 2
    while (existingNames.has(candidate.toLowerCase())) {
      candidate = type === "folder"
        ? `${initialName} ${suffix}`
        : initialName.includes(".")
          ? initialName.replace(/(\.[^.]*)?$/, ` ${suffix}$1`)
          : `${initialName} ${suffix}`
      suffix += 1
    }
    const slot = desktopItemIdRef.current++
    setDesktopItems(prev => [...prev.map(item => ({ ...item, selected: false })), {
      id: slot,
      name: candidate,
      type,
      slot,
      dx: 0,
      dy: 0,
      selected: true,
    }])
    setEditingDesktopItemId(slot)
    setEditingDesktopName(candidate)
  }, [desktopItems])

  const sanitizeEntryName = useCallback((type: "folder" | "file", rawName: string) => {
    const fallbackName = type === "folder" ? "New Folder" : "New File.txt"
    return rawName.replace(/[\\/:*?"<>|]/g, "").trim() || fallbackName
  }, [])

  const focusFolderWin = useCallback((id: number) => {
    const key = `folder:${id}` as const
    setControlCenterOpen(false)
    setFolderWins(ws => {
      const win = ws.find(w => w.id === id)
      if (!win) return ws
      return [...ws.filter(w => w.id !== id), { ...win, minimized: false, minimizing: false }]
    })
    setWindowOrder(o => [...o.filter(k => k !== key), key])
  }, [])

  const focusFileEditorWin = useCallback((id: number) => {
    const key = `file:${id}` as const
    setControlCenterOpen(false)
    setFileEditorWins(ws => {
      const win = ws.find(w => w.id === id)
      if (!win) return ws
      return [...ws.filter(w => w.id !== id), { ...win, minimized: false, minimizing: false }]
    })
    setWindowOrder(o => [...o.filter(k => k !== key), key])
  }, [])

  const getFolderUniqueName = useCallback((parentPath: string, type: "folder" | "file", requestedName: string, excludeName?: string) => {
    const sanitized = sanitizeEntryName(type, requestedName)
    const projectSlugs = (projects ?? []).map((p, i) => {
      const raw = p.title ?? `project-${i + 1}`
      return raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")
    })
    const allEntries = [...getStaticItems(parentPath, projectSlugs), ...(termFsRef.current[parentPath] ?? [])]
    const usedNames = new Set(
      allEntries
        .filter(entry => entry.name !== excludeName)
        .map(entry => entry.name.toLowerCase())
    )
    let finalName = sanitized
    let suffix = 2
    while (usedNames.has(finalName.toLowerCase())) {
      finalName = type === "folder"
        ? `${sanitized} ${suffix}`
        : sanitized.includes(".")
          ? sanitized.replace(/(\.[^.]*)?$/, ` ${suffix}$1`)
          : `${sanitized} ${suffix}`
      suffix += 1
    }
    return finalName
  }, [projects, sanitizeEntryName])

  const openFolderPathInTerminal = useCallback((folderPath: string) => {
    setTermMinimized(false)
    setTermMinimizing(false)
    setTerminalOpen(true)
    setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
    setTimeout(() => {
      setTermCwd(folderPath)
      inputRef.current?.focus()
    }, 80)
  }, [])

  const openFileEditorAtPath = useCallback((itemPath: string, itemName: string) => {
    const existing = fileEditorWins.find(f => f.path === itemPath)
    if (!existing) {
      const eid = fileEditorIdRef.current++
      const screenW = width - 20
      const screenH = Math.round(width * 0.609)
      const winW = Math.round(width * 0.66)
      const winH = Math.round(screenH * 0.62)
      const cascade = fileEditorWins.filter(win => !win.minimized).length
      const ex = Math.round((screenW - winW) / 2) + cascade * 22
      const ey = Math.round((screenH - winH) / 2) + cascade * 18
      setFileEditorWins(prev => [...prev, { id: eid, name: itemName, path: itemPath, pos: { x: ex, y: ey }, size: { w: winW, h: winH }, maximized: false, minimized: false, minimizing: false, hoveredTl: -1 }])
      setWindowOrder(o => [...o.filter(k => k !== fileOrderKey(eid)), fileOrderKey(eid)])
    } else {
      focusFileEditorWin(existing.id)
    }
  }, [fileEditorWins, width, fileOrderKey, focusFileEditorWin])

  const openFolderWindowAtPath = useCallback((itemPath: string, itemName: string) => {
    const fid = folderWinIdRef.current++
    const screenW = width - 20
    const screenH = Math.round(width * 0.609)
    const winW = Math.round(width * 0.62)
    const winH = Math.round(screenH * 0.58)
    const cascade = folderWins.filter(win => !win.minimized).length
    setFolderWins(prev => [...prev, {
      id: fid,
      name: itemName,
      path: itemPath,
      pos: { x: Math.round((screenW - winW) / 2) + cascade * 24, y: Math.round((screenH - winH) / 2) + cascade * 20 },
      size: { w: winW, h: winH },
      maximized: false,
      minimized: false,
      minimizing: false,
      hoveredTl: -1,
    }])
    setWindowOrder(o => [...o.filter(k => k !== folderOrderKey(fid)), folderOrderKey(fid)])
  }, [width, folderOrderKey, folderWins])

  const startFolderRename = useCallback((winId: number, path: string, name: string, type: "folder" | "file") => {
    setEditingFolderItem({ winId, path, originalName: name, type })
    setEditingFolderName(name)
    setFolderContextMenu(null)
    setFolderContextMenuHovered(null)
  }, [])

  const cancelFolderRename = useCallback(() => {
    setEditingFolderItem(null)
    setEditingFolderName("")
    folderRenameInputRef.current?.blur()
  }, [])

  const createFolderWindowEntry = useCallback((winId: number, parentPath: string, type: "folder" | "file") => {
    const finalName = getFolderUniqueName(parentPath, type, type === "folder" ? "New Folder" : "New File.txt")
    setTermFs(prev => ({
      ...prev,
      [parentPath]: [...(prev[parentPath] ?? []), { name: finalName, type }],
    }))
    if (type === "file") {
      setFileContents(prev => ({ ...prev, [`${parentPath}/${finalName}`]: prev[`${parentPath}/${finalName}`] ?? "" }))
    }
    setEditingFolderItem({ winId, path: parentPath, originalName: finalName, type })
    setEditingFolderName(finalName)
    setFolderContextMenu(null)
    setFolderContextMenuHovered(null)
  }, [getFolderUniqueName])

  const commitFolderRename = useCallback(() => {
    if (!editingFolderItem) return
    const { path: parentPath, originalName, type } = editingFolderItem
    const dynamicEntries = termFsRef.current[parentPath] ?? []
    const exists = dynamicEntries.some(entry => entry.name === originalName && entry.type === type)
    if (!exists) {
      cancelFolderRename()
      return
    }
    const finalName = getFolderUniqueName(parentPath, type, editingFolderName, originalName)
    if (finalName === originalName) {
      cancelFolderRename()
      return
    }
    const oldPath = `${parentPath}/${originalName}`
    const newPath = `${parentPath}/${finalName}`
    setTermFs(prev => {
      const next: TermFs = {}
      Object.entries(prev).forEach(([key, entries]) => {
        const mappedKey = key === oldPath
          ? newPath
          : key.startsWith(`${oldPath}/`)
            ? `${newPath}${key.slice(oldPath.length)}`
            : key
        next[mappedKey] = key === parentPath
          ? entries.map(entry => entry.name === originalName && entry.type === type ? { ...entry, name: finalName } : entry)
          : entries
      })
      return next
    })
    if (type === "file") {
      setFileContents(prev => {
        if (!(oldPath in prev)) return prev
        const next = { ...prev, [newPath]: prev[oldPath] }
        delete next[oldPath]
        return next
      })
    } else {
      setFileContents(prev => {
        const next = { ...prev }
        Object.keys(prev).forEach(key => {
          if (key === oldPath || key.startsWith(`${oldPath}/`)) {
            const mappedKey = key === oldPath ? newPath : `${newPath}${key.slice(oldPath.length)}`
            next[mappedKey] = prev[key]
            delete next[key]
          }
        })
        return next
      })
      setFolderWins(prev => prev.map(win => {
        if (win.path === oldPath) return { ...win, path: newPath, name: finalName }
        if (win.path.startsWith(`${oldPath}/`)) return { ...win, path: `${newPath}${win.path.slice(oldPath.length)}` }
        return win
      }))
    }
    setFileEditorWins(prev => prev.map(win => {
      if (win.path === oldPath) return { ...win, path: newPath, name: finalName }
      if (win.path.startsWith(`${oldPath}/`)) return { ...win, path: `${newPath}${win.path.slice(oldPath.length)}` }
      return win
    }))
    cancelFolderRename()
  }, [cancelFolderRename, editingFolderItem, editingFolderName, getFolderUniqueName])

  const deleteFolderWindowEntry = useCallback((parentPath: string, name: string, type: "folder" | "file") => {
    const targetPath = `${parentPath}/${name}`
    setTermFs(prev => {
      const next: TermFs = {}
      Object.entries(prev).forEach(([key, entries]) => {
        if (key === targetPath || key.startsWith(`${targetPath}/`)) return
        next[key] = key === parentPath
          ? entries.filter(entry => !(entry.name === name && entry.type === type))
          : entries
      })
      return next
    })
    setFileContents(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(key => {
        if (key === targetPath || key.startsWith(`${targetPath}/`)) delete next[key]
      })
      return next
    })
    setFolderWins(prev => prev.filter(win => win.path !== targetPath && !win.path.startsWith(`${targetPath}/`)))
    setFileEditorWins(prev => prev.filter(win => win.path !== targetPath && !win.path.startsWith(`${targetPath}/`)))
    setWindowOrder(prev => prev.filter(key => {
      if (typeof key === "string" && key.startsWith("folder:")) {
        const id = Number(key.slice(7))
        const win = folderWins.find(entry => entry.id === id)
        return !win || (win.path !== targetPath && !win.path.startsWith(`${targetPath}/`))
      }
      if (typeof key === "string" && key.startsWith("file:")) {
        const id = Number(key.slice(5))
        const win = fileEditorWins.find(entry => entry.id === id)
        return !win || (win.path !== targetPath && !win.path.startsWith(`${targetPath}/`))
      }
      return true
    }))
    if (editingFolderItem && editingFolderItem.path === parentPath && editingFolderItem.originalName === name && editingFolderItem.type === type) {
      cancelFolderRename()
    }
    setFolderContextMenu(null)
    setFolderContextMenuHovered(null)
  }, [cancelFolderRename, editingFolderItem, fileEditorWins, folderWins])

  const commitDesktopRename = useCallback((id: number) => {
    const target = desktopItems.find(item => item.id === id)
    if (!target) return
    const fallbackName = target.type === "folder" ? "New Folder" : "New File.txt"
    const sanitized = editingDesktopName.replace(/[\\/:*?"<>|]/g, "").trim() || fallbackName
    const usedNames = new Set(
      desktopItems
        .filter(item => item.id !== id)
        .map(item => item.name.toLowerCase())
    )
    let finalName = sanitized
    let suffix = 2
    while (usedNames.has(finalName.toLowerCase())) {
      finalName = target.type === "folder"
        ? `${sanitized} ${suffix}`
        : sanitized.includes(".")
          ? sanitized.replace(/(\.[^.]*)?$/, ` ${suffix}$1`)
          : `${sanitized} ${suffix}`
      suffix += 1
    }
    setDesktopItems(prev => prev.map(item => item.id === id ? { ...item, name: finalName, selected: false } : item))
    setEditingDesktopItemId(null)
    setEditingDesktopName("")
    desktopRenameInputRef.current?.blur()
  }, [desktopItems, editingDesktopName])

  const cancelDesktopRename = useCallback(() => {
    setDesktopItems(prev => prev.map(item => editingDesktopItemId !== null && item.id === editingDesktopItemId ? { ...item, selected: false } : item))
    setEditingDesktopItemId(null)
    setEditingDesktopName("")
    desktopRenameInputRef.current?.blur()
  }, [editingDesktopItemId])

  const openDesktopItem = useCallback((item: DesktopItem) => {
    const itemPath = item.path ?? `~/${item.name}`
    if (item.type === "folder") {
      openFolderWindowAtPath(itemPath, item.name)
      return
    }
    openFileEditorAtPath(itemPath, item.name)
  }, [openFileEditorAtPath, openFolderWindowAtPath])

  const openDesktopFolderInTerminal = useCallback((item: DesktopItem) => {
    const folderPath = item.path ?? `~/${item.name}`
    openFolderPathInTerminal(folderPath)
  }, [openFolderPathInTerminal])

  const deleteDesktopItem = useCallback((item: DesktopItem) => {
    if (item.locked) return
    const itemPath = item.path ?? `~/${item.name}`
    setDesktopItems(prev => prev.filter(entry => entry.id !== item.id).map(entry => ({ ...entry, selected: false })))
    setFolderWins(prev => prev.filter(win => win.path !== itemPath && !win.path.startsWith(`${itemPath}/`)))
    setFileEditorWins(prev => prev.filter(win => win.path !== itemPath && !win.path.startsWith(`${itemPath}/`)))
    setWindowOrder(prev => prev.filter(key => {
      if (typeof key === "string" && key.startsWith("folder:")) {
        const id = Number(key.slice(7))
        const win = folderWins.find(entry => entry.id === id)
        return !win || (win.path !== itemPath && !win.path.startsWith(`${itemPath}/`))
      }
      if (typeof key === "string" && key.startsWith("file:")) {
        const id = Number(key.slice(5))
        const win = fileEditorWins.find(entry => entry.id === id)
        return !win || (win.path !== itemPath && !win.path.startsWith(`${itemPath}/`))
      }
      return true
    }))
    setFileContents(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(path => {
        if (path === itemPath || path.startsWith(`${itemPath}/`)) delete next[path]
      })
      return next
    })
    setTermFs(prev => {
      const next: TermFs = {}
      Object.entries(prev).forEach(([path, entries]) => {
        if (path === itemPath || path.startsWith(`${itemPath}/`)) return
        next[path] = entries.filter(entry => !(path === "~" && entry.name === item.name))
      })
      return next
    })
  }, [fileEditorWins, folderWins])

  const moveDesktopItemToFolder = useCallback((draggedId: number, targetFolderId: number) => {
    const draggedItem = desktopItems.find(item => item.id === draggedId)
    const targetFolder = desktopItems.find(item => item.id === targetFolderId && item.type === "folder")
    if (!draggedItem || !targetFolder || draggedItem.id === targetFolder.id) return

    const targetPath = `~/${targetFolder.name}`
    const siblingNames = new Set((termFsRef.current[targetPath] ?? []).map(entry => entry.name.toLowerCase()))
    let finalName = draggedItem.name
    let suffix = 2
    while (siblingNames.has(finalName.toLowerCase())) {
      finalName = draggedItem.type === "folder"
        ? `${draggedItem.name} ${suffix}`
        : draggedItem.name.includes(".")
          ? draggedItem.name.replace(/(\.[^.]*)?$/, ` ${suffix}$1`)
          : `${draggedItem.name} ${suffix}`
      suffix += 1
    }

    setDesktopItems(prev => prev.filter(item => item.id !== draggedId).map(item => ({ ...item, selected: false, dx: 0, dy: 0 })))
    setTermFs(prev => {
      const next: TermFs = { ...prev }
      const targetEntries = [...(next[targetPath] ?? []), { name: finalName, type: draggedItem.type }]
      next[targetPath] = targetEntries

      if (draggedItem.type === "folder") {
        const oldPath = `~/${draggedItem.name}`
        const newPath = `${targetPath}/${finalName}`
        Object.keys(next).forEach(path => {
          if (path === oldPath || path.startsWith(`${oldPath}/`)) {
            const mappedPath = path === oldPath ? newPath : `${newPath}${path.slice(oldPath.length)}`
            next[mappedPath] = next[path]
            delete next[path]
          }
        })
      }
      return next
    })
    if (draggedItem.type === "file") {
      setFileContents(prev => {
        const oldPath = `~/${draggedItem.name}`
        const newPath = `${targetPath}/${finalName}`
        if (!(oldPath in prev)) return prev
        const next = { ...prev, [newPath]: prev[oldPath] }
        delete next[oldPath]
        return next
      })
    }
  }, [desktopItems])

  const openTerminalWindow = useCallback(() => {
    setTermMinimized(false)
    setTermMinimizing(false)
    setTerminalOpen(true)
    setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"])
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stampMessageTime = useCallback(() => (
    new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  ), [])

  const handleSendMessage = useCallback(() => {
    const text = messagesDraft.trim()
    if (!text) return
    setMessagesConversation((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: ++messageIdRef.current,
          fromMe: true,
          text,
          time: stampMessageTime(),
        },
      ],
    }))
    setMessagesDraft("")
  }, [messagesDraft, stampMessageTime])

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
    const echo = { text: `${cwdDisplay} $ ${raw}`, color: dimColor }

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
        setTermLines(l => [...l, echo, { text: "  mkdir: invalid name - use letters, numbers, _ . -", color: "#ff453a" }])
      } else {
        const fs = termFsRef.current
        if ((fs[cwd] ?? []).some(e => e.name === name)) {
          setTermLines(l => [...l, echo, { text: `  mkdir: ${name}: already exists`, color: "#ff9f0a" }])
        } else {
          setTermFs(prev => ({ ...prev, [cwd]: [...(prev[cwd] ?? []), { name, type: "folder" }] }))
          setTermLines(l => [...l, echo, { text: `  Created folder: ${name}`, color: "#30d158" }])
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
        setTermLines(l => [...l, echo, { text: "  touch: invalid name - use letters, numbers, _ . -", color: "#ff453a" }])
      } else {
        const fs = termFsRef.current
        if ((fs[cwd] ?? []).some(e => e.name === name)) {
          setTermLines(l => [...l, echo, { text: `  ${name}: already exists`, color: "#ff9f0a" }])
        } else {
          setTermFs(prev => ({ ...prev, [cwd]: [...(prev[cwd] ?? []), { name, type: "file" }] }))
          setTermLines(l => [...l, echo, { text: `  Created file: ${name}`, color: "#30d158" }])
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
          ? tags.map(t => ({ text: `  - ${t}`, color: "#64d2ff" }))
          : [{ text: "  No stack info available.", color: "#e2e8f0" }]
        ),
      ])
    } else if (cmd === "features") {
      setTermLines(l => [...l, echo,
        ...(features && features.length > 0
          ? features.map(f => ({ text: `  - ${f}`, color: "#e2e8f0" }))
          : [{ text: "  No features listed.", color: "#e2e8f0" }]
        ),
      ])
    } else if (cmd === "github") {
      if (githubUrl && githubUrl !== "#") {
        setTermLines(l => [...l, echo, { text: "  Opening GitHub...", color: "#30d158" }])
        window.open(githubUrl, "_blank", "noopener,noreferrer")
      } else {
        setTermLines(l => [...l, echo, { text: "  No GitHub repo available.", color: "#ff453a" }])
      }
    } else if (cmd === "live") {
      if (liveUrl && liveUrl !== "#") {
        setTermLines(l => [...l, echo, { text: "  Opening live demo...", color: "#30d158" }])
        openSafariUrl(liveUrl)
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
        setTermLines(l => [...l, echo, { text: "  write: invalid filename - use letters, numbers, _ . -", color: "#ff453a" }])
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
          { text: "  Saved ", color: "#30d158" },
          { text: name, color: "#64d2ff" },
          { text: " written  ", color: "#30d158" },
          { text: `(${content.length} chars)`, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" },
        ]}])
      }
    } else if (cmd === "clear" || cmd === "cls") {
      setTermLines([])
    } else if (cmd === "help") {
      const helpLine = (name: string, text: string) => ({
        text: `${name.padEnd(12, " ")}${text}`,
        color: isDark ? "rgba(255,255,255,0.74)" : "rgba(0,0,0,0.74)",
      })
      setTermLines(l => [...l, echo,
        { text: "Terminal commands", color: isDark ? "#f5f5f7" : "#111827" },
        { text: "Filesystem", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.34)" },
        helpLine("ls", "List directory contents"),
        helpLine("mkdir", "Create a folder"),
        helpLine("touch", "Create an empty file"),
        helpLine("write", "Write text into a file"),
        helpLine("cd", "Change directory"),
        { text: "" },
        { text: "Project", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.34)" },
        helpLine("desc", "Show project description"),
        helpLine("stack", "Show tech stack"),
        helpLine("features", "List key features"),
        helpLine("github", "Open repo in browser"),
        helpLine("live", "Open live demo"),
        { text: "" },
        { text: "Terminal", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.34)" },
        helpLine("clear", "Clear the screen"),
        helpLine("help", "Show this list"),
      ])
    } else if (cmd === "") {
      setTermLines(l => [...l, echo])
    } else {
      setTermLines(l => [...l, echo,
        { text: `command not found: ${cmd}  (try: help)`, color: "#ff453a" },
      ])
    }
    setTermInput("")
  }, [description, tags, features, githubUrl, liveUrl, projectSlug, isDark, allProjectSlugs, openWindow, openSafariUrl])

  // Auto-focus input and reset terminal when it opens
  useEffect(() => {
    if (terminalOpen) {
      const cwd = proj ? `~/projects/${projectSlug}` : "~"
      setTermCwd(cwd)
      // sync desktop items back into termFs["~"] so ls reflects the screen
      setTermFs(prev => ({
        ...prev,
        "~": desktopItems.filter(d => !d.locked).map(d => ({ name: d.name, type: d.type })),
      }))
      setTermLines([])
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
  }, [terminalOpen])

  // Auto-scroll terminal body
  useEffect(() => {
    if (termBodyRef.current) termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight
  }, [termLines])

  const safariUrl = safariTabs.find(tab => tab.id === activeSafariTabId)?.url ?? ""

  useEffect(() => {
    setSafariInput(safariUrl)
  }, [safariUrl, activeSafariTabId])

  useEffect(() => {
    if (!safariOpen || !safariInputFocused) return
    const timer = setTimeout(() => {
      safariInputRef.current?.focus()
      safariInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [safariOpen, safariInputFocused, activeSafariTabId])

  useEffect(() => {
    if (messagesBodyRef.current) {
      messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight
    }
  }, [messagesConversation])

  useEffect(() => {
    if (!messagesOpen || messagesMinimized) {
      setHoveredMessagesTl(-1)
    }
  }, [messagesOpen, messagesMinimized])

  useEffect(() => {
    if (editingDesktopItemId === null) return
    const timer = setTimeout(() => {
      desktopRenameInputRef.current?.focus()
      desktopRenameInputRef.current?.select()
    }, 30)
    return () => clearTimeout(timer)
  }, [editingDesktopItemId])

  useEffect(() => {
    if (!editingFolderItem) return
    const timer = setTimeout(() => {
      folderRenameInputRef.current?.focus()
      folderRenameInputRef.current?.select()
    }, 30)
    return () => clearTimeout(timer)
  }, [editingFolderItem])

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

  // All navigable dock items in order - defined after computeTargets
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
    { type: "itunes" as const, refIdx: dockCount + 4 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projects?.length, imgList.length, dockCount, showTerminalIcon, showGithubIcon])

  // Reset focus when MacBook loses hover
  useEffect(() => {
    if (!hovered) focusedDockIdxRef.current = -1
  }, [hovered])

  useEffect(() => {
    if (!dockSleeping) return
    setHoveredSlot(null)
    resetTargets()
  }, [dockSleeping, resetTargets])

  useEffect(() => {
    if (!dockSleeping && dockPeek) setDockPeek(false)
  }, [dockSleeping, dockPeek])

  // Keyboard shortcuts - only active after the MacBook has been clicked
  useEffect(() => {
    if (!hovered || !macKeyboardActive) return
    const activateSwitchTarget = (target: SwitchableKey) => {
      if (typeof target === "string" && target.startsWith("folder:")) {
        focusFolderWin(Number(target.slice(7)))
        return
      }
      if (typeof target === "string" && target.startsWith("file:")) {
        focusFileEditorWin(Number(target.slice(5)))
        return
      }
      if (target === "finder") {
        bringToFront("finder")
      } else if (target === "terminal") {
        bringToFront("terminal")
        setTimeout(() => inputRef.current?.focus(), 50)
      } else if (target === "messages") {
        bringToFront("messages")
      } else if (target === "safari") {
        bringToFront("safari")
      } else if (target === "itunes") {
        bringToFront("itunes")
      } else if (typeof target === "number") {
        focusWin(target)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setQShortcutHeld(true)
        return
      }
      if (qShortcutHeld && e.key === "Tab") {
        e.preventDefault()
        if (switchableWindows.length < 2) return
        setAppSwitcherVisible(true)
        setAppSwitcherIndex(current => {
          if (!appSwitcherVisible) {
            return e.shiftKey
              ? 0
              : Math.max(0, switchableWindows.length - 2)
          }
          return e.shiftKey
            ? (current - 1 + switchableWindows.length) % switchableWindows.length
            : (current + 1) % switchableWindows.length
        })
        return
      }
      if (e.key === "q" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // close the topmost window in the unified stack
        const top = [...windowOrder].reverse().find(k => {
          if (typeof k === "string" && k.startsWith("folder:")) {
            const id = Number(k.slice(7))
            return folderWins.some(w => w.id === id)
          }
          if (typeof k === "string" && k.startsWith("file:")) {
            const id = Number(k.slice(5))
            return fileEditorWins.some(w => w.id === id)
          }
          if (k === "finder") return finderOpen && !finderMinimized
          if (k === "itunes") return itunesOpen && !itunesMinimized
          if (k === "messages") return messagesOpen && !messagesMinimized
          if (k === "terminal") return terminalOpen && !termMinimized
          if (k === "safari") return safariOpen && !safariMinimized
          return openWindows.some(w => w.id === k && !w.minimized)
        })
        if (typeof top === "string" && top.startsWith("folder:")) {
          const id = Number(top.slice(7))
          setFolderWins(prev => prev.filter(win => win.id !== id))
          setWindowOrder(o => o.filter(k => k !== top))
        } else if (typeof top === "string" && top.startsWith("file:")) {
          const id = Number(top.slice(5))
          setFileEditorWins(prev => prev.filter(win => win.id !== id))
          setWindowOrder(o => o.filter(k => k !== top))
        } else if (top === "finder") {
          setFinderOpen(false); setFinderMinimized(false); setFinderMaximized(false); setFinderPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "finder"))
        } else if (top === "itunes") {
          setItunesOpen(false); setWindowOrder(o => o.filter(k => k !== "itunes"))
        } else if (top === "messages") {
          setMessagesOpen(false); setMessagesMinimized(false); setMessagesMaximized(false); setMessagesPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "messages"))
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
        // Don't intercept Enter key if an input field is focused (like terminal input)
        if (document.activeElement?.tagName === "INPUT") return
        
        const item = dockItems[focusedDockIdxRef.current]
        if (!item) return
        if (item.type === "finder") {
          const isOnTop = windowOrder[windowOrder.length - 1] === "finder"
          if (!finderOpen || finderMinimized) {
            setFinderOpen(true); setFinderMinimized(false); setFinderMinimizing(false)
            setWindowOrder(o => [...o.filter(k => k !== "finder"), "finder"])
          } else if (isOnTop) {
            setFinderMinimizing(true)
            setTimeout(() => { setFinderMinimized(true); setFinderMinimizing(false) }, 340)
          } else {
            setWindowOrder(o => [...o.filter(k => k !== "finder"), "finder"])
          }
        }
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
        if (item.type === "messages") {
          const isOnTop = windowOrder[windowOrder.length - 1] === "messages"
          if (!messagesOpen || messagesMinimized) {
            setMessagesMinimized(false); setMessagesMinimizing(false); setMessagesOpen(true)
            setWindowOrder(o => [...o.filter(k => k !== "messages"), "messages"])
          } else if (isOnTop) {
            setMessagesMinimizing(true)
            setTimeout(() => { setMessagesMinimized(true); setMessagesMinimizing(false) }, 340)
          } else {
            setWindowOrder(o => [...o.filter(k => k !== "messages"), "messages"])
          }
        }
        if (item.type === "safari") {
          if (safariOpen && safariMinimized) { setSafariMinimized(false); bringToFront("safari") }
          else { setSafariOpen(o => !o); bringToFront("safari") }
        }
        if (item.type === "itunes") {
          if (itunesOpen && itunesMinimized) { setItunesMinimized(false); bringToFront("itunes") }
          else { setItunesOpen(o => !o); bringToFront("itunes") }
        }
        if (item.type === "github") {
          if (projects && openWindows.length === 0) {
            setTermOrigin("50% 80%"); setTerminalOpen(true)
            setTimeout(() => setTermLines(l => [...l, { text: "  Select a project first.", color: "#ff453a" }]), 120)
          } else if (githubUrl && githubUrl !== "#") {
            window.open(githubUrl, "_blank", "noopener,noreferrer")
          }
        }
        if (item.type === "vscode") {
          if (vscodeAudioRef.current) {
            vscodeAudioRef.current.pause()
            vscodeAudioRef.current.currentTime = 0
            vscodeAudioRef.current.play().catch(() => {})
          }
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q") {
        setQShortcutHeld(false)
        if (appSwitcherVisible) {
          const selected = switchableWindows[appSwitcherIndex]
          if (selected) activateSwitchTarget(selected.key)
          setAppSwitcherVisible(false)
        }
      }
    }
    window.addEventListener("keydown", onKey, { capture: true })
    window.addEventListener("keyup", onKeyUp, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true })
      window.removeEventListener("keyup", onKeyUp, { capture: true })
    }
  }, [hovered, macKeyboardActive, qShortcutHeld, terminalOpen, termMinimized, quickLookOpen, imgList.length, dockItems, computeTargets, githubUrl, focusedWinId, closeWindow, termPos, windowOrder, itunesOpen, itunesMinimized, openWindows, bringToFront, messagesOpen, messagesMinimized, finderOpen, finderMinimized, safariOpen, safariMinimized, focusWin, focusFolderWin, focusFileEditorWin, switchableWindows, appSwitcherVisible, appSwitcherIndex, folderWins, fileEditorWins])

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
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
      background: "#000",
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

  // Fixed slot size - icons scale via CSS transform, no layout reflow
  const slotSize = ICON_BASE
  // Reserve enough vertical room for the tallest possible scaled icon
  const dockH = Math.round(ICON_BASE * MAX_SCALE) + DOCK_PAD_Y * 2 + 4

  const switchWallpaper = useCallback((nextWallpaper: string) => {
    if (!nextWallpaper || nextWallpaper === wallpaper) return
    setPrevWallpaper(wallpaper)
    setWallpaper(nextWallpaper)
    setWallpaperTransitioning(false)
    window.setTimeout(() => {
      setWallpaperTransitioning(true)
    }, 16)
  }, [wallpaper])

  useEffect(() => {
    if (!wallpaperTransitioning) return
    const timer = window.setTimeout(() => {
      setPrevWallpaper(null)
      setWallpaperTransitioning(false)
    }, 520)
    return () => window.clearTimeout(timer)
  }, [wallpaperTransitioning])

  return (
    <div
      ref={macRef}
      data-mac-root
      className={className}
      style={s.scene}
      onMouseDownCapture={() => setMacKeyboardActive(true)}
    >
      <audio ref={vscodeAudioRef} src="/sounds/trum-vscode-cmt.mp3" preload="auto" />
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
                }}>Let&apos;s build something great ??</span>
              </div>
            </div>
          </div>

          <div ref={screenRef} data-mac-screen style={s.screen} onMouseEnter={resetTargets} onClick={() => {
            setMacKeyboardActive(true)
            setControlCenterOpen(false)
            setContextMenu(null)
            setFolderContextMenu(null)
            cancelDesktopRename()
            cancelFolderRename()
          }} onContextMenu={e => {
            e.preventDefault()
            if (hasBlockingWindowOpen) return
            const rect = screenRef.current?.getBoundingClientRect()
            if (rect) {
              setContextMenuHovered(null)
              setFolderContextMenu(null)
              cancelDesktopRename()
              cancelFolderRename()
              setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetId: null })
            }
          }}>
            {prevWallpaper && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `url("${prevWallpaper}") center/cover no-repeat`,
                  opacity: wallpaperTransitioning ? 0 : 1,
                  transform: wallpaperTransitioning ? "scale(1.018)" : "scale(1)",
                  transition: "opacity 0.52s ease, transform 0.7s ease",
                  zIndex: 0,
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `url("${wallpaper}") center/cover no-repeat`,
                opacity: 1,
                transform: "scale(1)",
                transition: "opacity 0.52s ease",
                zIndex: 0,
              }}
            />
            <div style={s.screenOff} />
            <div style={s.screenOn} onClick={() => {
              setDesktopItems(prev => prev.map(d => ({ ...d, selected: false })))
              setContextMenu(null)
              setFolderContextMenu(null)
              cancelDesktopRename()
              cancelFolderRename()
            }}>

              {/* Desktop icons - folders/files created via terminal */}
              {desktopItems.length > 0 && (() => {
                const mbH      = Math.round(h * 0.036)
                const dockH    = Math.round(w * 0.13)
                const availH   = h - mbH - dockH
                const iw       = Math.round(w * 0.072)
                const ih       = Math.round(w * 0.09)
                const gap      = Math.round(w * 0.014)
                const padR     = Math.round(w * 0.022)
                const padT     = Math.round(w * 0.018)
                const screenW  = w - 20
                const padL     = Math.round(w * 0.018)
                const minLeft  = padL
                const maxLeft  = screenW - padR - iw
                const minTop   = mbH + padT
                const maxTop   = mbH + availH - ih - Math.round(w * 0.01)
                const perCol   = Math.max(1, Math.floor((availH - padT) / (ih + gap)))
                const totalCols = Math.max(1, Math.floor((screenW - padL - padR - iw) / (iw + gap)) + 1)
                return desktopItems.map(item => {
                  const col  = Math.floor(item.slot / perCol)
                  const row  = item.slot % perCol
                  const bx   = (w - 20) - padR - iw - col * (iw + gap)
                  const by   = mbH + padT + row * (ih + gap)
                  const ix   = bx + item.dx
                  const iy   = by + item.dy
                  const iconSrc = item.type === "folder" ? FOLDER_ICON : FILE_ICON
                  const isEditing = editingDesktopItemId === item.id
                  return (
                    <div
                      key={item.id}
                      onContextMenu={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (hasBlockingWindowOpen) return
                        const rect = screenRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setDesktopItems(prev => prev.map(d => ({ ...d, selected: d.id === item.id })))
                        setContextMenuHovered(null)
                        setFolderContextMenu(null)
                        cancelDesktopRename()
                        cancelFolderRename()
                        setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetId: item.id })
                      }}
                      onMouseDown={e => {
                        e.stopPropagation()
                        // double-click detection
                        const now = Date.now()
                        const last = desktopClickRef.current
                        if (last.id === item.id && now - last.time < 350) {
                          const ipath = item.path ?? `~/${item.name}`
                          if (item.type === "folder") {
                            openFolderWindowAtPath(ipath, item.name)
                          } else {
                            openFileEditorAtPath(ipath, item.name)
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
                          const unclampedLeft = bx + drag.ox + ev.clientX - drag.startX
                          const unclampedTop = by + drag.oy + ev.clientY - drag.startY
                          const clampedLeft = Math.max(minLeft, Math.min(maxLeft, unclampedLeft))
                          const clampedTop = Math.max(minTop, Math.min(maxTop, unclampedTop))
                          setDesktopItems(prev => prev.map(d => d.id === drag.id
                            ? { ...d, dx: clampedLeft - bx, dy: clampedTop - by }
                            : d
                          ))
                        }
                        const onUp = () => {
                          const currentItems = desktopItemsRef.current
                          const draggedItem = currentItems.find(d => d.id === item.id)
                          const draggedCol = draggedItem ? Math.floor(draggedItem.slot / perCol) : 0
                          const draggedRow = draggedItem ? draggedItem.slot % perCol : 0
                          const draggedBaseX = (w - 20) - padR - iw - draggedCol * (iw + gap)
                          const draggedBaseY = mbH + padT + draggedRow * (ih + gap)
                          const draggedLeft = draggedItem ? draggedBaseX + draggedItem.dx : ix
                          const draggedTop = draggedItem ? draggedBaseY + draggedItem.dy : iy
                          const dropTarget = currentItems.find(other => {
                            if (other.id === item.id || other.type !== "folder") return false
                            const otherCol = Math.floor(other.slot / perCol)
                            const otherRow = other.slot % perCol
                            const otherLeft = (w - 20) - padR - iw - otherCol * (iw + gap)
                            const otherTop = mbH + padT + otherRow * (ih + gap)
                            const otherX = otherLeft + other.dx
                            const otherY = otherTop + other.dy
                            const draggedRect = {
                              left: draggedLeft,
                              right: draggedLeft + iw,
                              top: draggedTop,
                              bottom: draggedTop + ih,
                            }
                            const targetRect = {
                              left: otherX,
                              right: otherX + iw,
                              top: otherY,
                              bottom: otherY + ih,
                            }
                            const overlapX = Math.min(draggedRect.right, targetRect.right) - Math.max(draggedRect.left, targetRect.left)
                            const overlapY = Math.min(draggedRect.bottom, targetRect.bottom) - Math.max(draggedRect.top, targetRect.top)
                            return overlapX > iw * 0.45 && overlapY > ih * 0.45
                          })
                          if (dropTarget) {
                            moveDesktopItemToFolder(item.id, dropTarget.id)
                            desktopDragRef.current = null
                            window.removeEventListener("mousemove", onMove)
                            window.removeEventListener("mouseup", onUp)
                            return
                          }
                          setDesktopItems(prev => {
                            const dragged = prev.find(d => d.id === item.id)
                            if (!dragged) return prev
                            const currentCol = Math.floor(dragged.slot / perCol)
                            const currentRow = dragged.slot % perCol
                            const currentBaseX = (w - 20) - padR - iw - currentCol * (iw + gap)
                            const currentBaseY = mbH + padT + currentRow * (ih + gap)
                            const currentLeft = currentBaseX + dragged.dx
                            const currentTop = currentBaseY + dragged.dy
                            const maxCol = Math.max(0, totalCols - 1)
                            const targetCol = Math.max(0, Math.min(maxCol, Math.round((screenW - padR - iw - currentLeft) / (iw + gap))))
                            const targetRow = Math.max(0, Math.min(perCol - 1, Math.round((currentTop - (mbH + padT)) / (ih + gap))))
                            const targetSlot = targetCol * perCol + targetRow
                            const occupied = prev.find(d => d.id !== dragged.id && d.slot === targetSlot)
                            return prev.map(d => {
                              if (d.id === dragged.id) return { ...d, slot: targetSlot, dx: 0, dy: 0 }
                              if (occupied && d.id === occupied.id) return { ...d, slot: dragged.slot, dx: 0, dy: 0 }
                              if (d.id === dragged.id || d.id === occupied?.id) return d
                              return d
                            })
                          })
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
                      {isEditing ? (
                        <input
                          ref={desktopRenameInputRef}
                          value={editingDesktopName}
                          onChange={e => setEditingDesktopName(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                          onBlur={() => commitDesktopRename(item.id)}
                          onKeyDown={e => {
                            e.stopPropagation()
                            if (e.key === "Enter") commitDesktopRename(item.id)
                            if (e.key === "Escape") cancelDesktopRename()
                          }}
                          style={{
                            width: "100%",
                            fontSize: Math.round(w * 0.013),
                            color: "white",
                            textAlign: "center",
                            lineHeight: 1.2,
                            padding: `2px ${Math.round(w * 0.005)}px`,
                            borderRadius: 4,
                            border: "1px solid rgba(255,255,255,0.75)",
                            background: "rgba(10,132,255,0.65)",
                            outline: "none",
                            boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
                            textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                            fontFamily: "-apple-system,'SF Pro Text',sans-serif",
                          }}
                        />
                      ) : (
                        <span style={{
                          width: "100%",
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
                      )}
                    </div>
                  )
                })
              })()}

              {/* Folder windows - opened by double-clicking a desktop folder */}
              {folderWins.filter(fw => !fw.minimized).map(fw => {
                const fwW = fw.size.w
                const fwH = fw.size.h
                const mbH = Math.round(h * 0.036)
                const titleH = 22
                const tlSz2  = Math.round(titleH * 0.54)
                const tlGap2 = Math.round(titleH * 0.45)
                const tlLeft2= Math.round(titleH * 0.64)
                const fwBg   = isDark ? "#1c1c1e" : "#f4f4f6"
                const fwDiv  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                const fwText = isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.8)"
                const fwSub  = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)"
                const contents = [...getStaticItems(fw.path, allProjectSlugs), ...(termFsRef.current[fw.path] ?? [])]
                const fwKey = folderOrderKey(fw.id)
                const zIdx = 3 + (windowOrder.indexOf(fwKey) >= 0 ? windowOrder.indexOf(fwKey) : windowOrder.length + fw.id)
                return (
                  <div
                    key={fw.id}
                    onClick={e => { e.stopPropagation(); focusFolderWin(fw.id) }}
                    style={{
                      position: "absolute",
                      ...(fw.maximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : { left: fw.pos.x, top: fw.pos.y, width: fwW, height: fwH }),
                      borderRadius: fw.maximized ? 0 : 10,
                      borderTopLeftRadius: fw.maximized ? 12 : 10,
                      borderTopRightRadius: fw.maximized ? 12 : 10,
                      background: fwBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.6)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.14)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: zIdx,
                      transition: folderWinDragRef.current?.id === fw.id ? "none" : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
                      animation: fw.minimizing ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards" : "winIn 0.28s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        if (fw.maximized) return
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
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            setFolderWins(prev => prev.map(f => f.id === fw.id ? { ...f, maximized: true, pos: { x: f.pos.x, y: Math.max(f.pos.y, 28) } } : f))
                          }
                          folderWinDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: titleH, flexShrink: 0, background: isDark ? "#2c2c2e" : "#ececec", borderBottom: `0.5px solid ${fwDiv}`, display: "flex", alignItems: "center", position: "relative", userSelect: "none", cursor: fw.maximized ? "default" : "grab" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap2, paddingLeft: tlLeft2 }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, symClr: "#460804", fn: () => { setFolderWins(prev => prev.filter(f => f.id !== fw.id)); setWindowOrder(o => o.filter(k => k !== fwKey)) } },
                          { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, symClr: "#90591d", fn: () => { setFolderWins(prev => prev.map(f => f.id === fw.id ? { ...f, minimizing: true } : f)); setTimeout(() => setFolderWins(prev => prev.map(f => f.id === fw.id ? { ...f, minimized: true, minimizing: false } : f)), 340) } },
                          { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, symClr: "#2a6218", fn: () => setFolderWins(prev => prev.map(f => f.id === fw.id ? { ...f, maximized: !f.maximized } : f)) },
                        ].map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); btn.fn() }}
                            onMouseEnter={() => setFolderWins(prev => prev.map(f => f.id === fw.id ? { ...f, hoveredTl: i } : f))}
                            onMouseLeave={() => setFolderWins(prev => prev.map(f => f.id === fw.id ? { ...f, hoveredTl: -1 } : f))}
                            style={{ width: tlSz2, height: tlSz2, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <TrafficLightSymbol kind={btn.kind} color={btn.symClr} size={Math.round(tlSz2 * 0.84)} visible={fw.hoveredTl === i} />
                          </div>
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: Math.round(w * 0.021), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.58)", fontFamily: "-apple-system,'SF Pro Text',sans-serif" }}>{fw.name}</span>
                      </div>
                    </div>

                    {/* Toolbar */}
                    <div style={{ height: 28, flexShrink: 0, background: isDark ? "#242426" : "#f0f0f2", borderBottom: `0.5px solid ${fwDiv}`, display: "flex", alignItems: "center", paddingLeft: Math.round(fwW * 0.03), gap: 6 }}>
                      <span style={{ fontSize: Math.round(w * 0.021), color: fwSub, fontFamily: "-apple-system,sans-serif" }}>{fw.path.replace("~", "~")}</span>
                    </div>

                    {/* Content */}
                    <div
                      onClick={() => {
                        setFolderContextMenu(null)
                        setFolderContextMenuHovered(null)
                      }}
                      onContextMenu={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        const rect = screenRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setContextMenu(null)
                        setContextMenuHovered(null)
                        cancelDesktopRename()
                        cancelFolderRename()
                        setFolderContextMenu({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          winId: fw.id,
                          path: fw.path,
                          targetName: null,
                          targetType: null,
                          mutable: true,
                        })
                      }}
                      style={{ flex: 1, overflowY: "auto", padding: Math.round(fwW * 0.04), display: "flex", flexWrap: "wrap", gap: Math.round(fwW * 0.03), alignContent: "flex-start" }}
                    >
                      {contents.length === 0 ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, opacity: 0.4 }}>
                          <img src={FOLDER_ICON} width={Math.round(w * 0.06)} height={Math.round(w * 0.06)} style={{ objectFit: "contain", opacity: 0.4 }} draggable={false} />
                          <span style={{ fontSize: Math.round(w * 0.024), color: fwSub, fontFamily: "-apple-system,sans-serif" }}>Folder is empty</span>
                          <span style={{ fontSize: Math.round(w * 0.02), color: fwSub, fontFamily: "-apple-system,sans-serif", opacity: 0.7 }}>Use  touch &lt;name&gt;  in terminal</span>
                        </div>
                      ) : (
                        contents.map((item, ci) => {
                          const ipath = `${fw.path}/${item.name}`
                          const isMutable = (termFsRef.current[fw.path] ?? []).some(entry => entry.name === item.name && entry.type === item.type)
                          const isEditing = editingFolderItem?.winId === fw.id
                            && editingFolderItem.path === fw.path
                            && editingFolderItem.originalName === item.name
                            && editingFolderItem.type === item.type
                          return (
                            <div
                              key={ci}
                              onContextMenu={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                const rect = screenRef.current?.getBoundingClientRect()
                                if (!rect) return
                                setContextMenu(null)
                                setContextMenuHovered(null)
                                cancelDesktopRename()
                                cancelFolderRename()
                                setFolderContextMenu({
                                  x: e.clientX - rect.left,
                                  y: e.clientY - rect.top,
                                  winId: fw.id,
                                  path: fw.path,
                                  targetName: item.name,
                                  targetType: item.type,
                                  mutable: isMutable,
                                })
                              }}
                              onMouseDown={() => {
                                const now = Date.now()
                                const last = itemClickRef.current
                                if (last.path === ipath && now - last.time < 350) {
                                  itemClickRef.current = { path: "", time: 0 }
                                  if (item.type === "file") {
                                    openFileEditorAtPath(ipath, item.name)
                                  } else {
                                    openFolderWindowAtPath(ipath, item.name)
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
                              {isEditing ? (
                                <input
                                  ref={folderRenameInputRef}
                                  value={editingFolderName}
                                  onChange={e => setEditingFolderName(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  onMouseDown={e => e.stopPropagation()}
                                  onBlur={commitFolderRename}
                                  onKeyDown={e => {
                                    e.stopPropagation()
                                    if (e.key === "Enter") commitFolderRename()
                                    if (e.key === "Escape") cancelFolderRename()
                                  }}
                                  style={{
                                    width: "100%",
                                    fontSize: Math.round(w * 0.016),
                                    color: fwText,
                                    textAlign: "center",
                                    lineHeight: 1.2,
                                    padding: `2px ${Math.round(w * 0.004)}px`,
                                    borderRadius: 4,
                                    border: `1px solid ${isDark ? "rgba(255,255,255,0.32)" : "rgba(10,132,255,0.42)"}`,
                                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.94)",
                                    outline: "none",
                                    boxShadow: isDark ? "0 0 0 1px rgba(255,255,255,0.06)" : "0 0 0 1px rgba(10,132,255,0.12)",
                                    fontFamily: "-apple-system,sans-serif",
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: Math.round(w * 0.016), color: fwText, textAlign: "center", wordBreak: "break-all", lineHeight: 1.2, maxWidth: "100%", fontFamily: "-apple-system,sans-serif" }}>{item.name}</span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                    {!fw.maximized && <ResizeHandle
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        const startX = e.clientX
                        const startY = e.clientY
                        const startW = fwW
                        const startH = fwH
                        const minW = Math.round(w * 0.42)
                        const minH = Math.round(h * 0.34)
                        const maxW = Math.max(minW, (w - 20) - fw.pos.x)
                        const maxH = Math.max(minH, h - fw.pos.y)
                        const onMove = (ev: MouseEvent) => {
                          setFolderWins(prev => prev.map(f => f.id === fw.id ? {
                            ...f,
                            size: {
                              w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                              h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                            },
                          } : f))
                        }
                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                    />}
                  </div>
                )
              })}

              {/* File editor windows */}
              {fileEditorWins.filter(fe => !fe.minimized).map(fe => {
                const feW = fe.size.w
                const feH = fe.size.h
                const mbH = Math.round(h * 0.036)
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
                const feKey = fileOrderKey(fe.id)
                const zIdx = 3 + (windowOrder.indexOf(feKey) >= 0 ? windowOrder.indexOf(feKey) : windowOrder.length + fe.id)
                return (
                  <div
                    key={fe.id}
                    onClick={e => { e.stopPropagation(); focusFileEditorWin(fe.id) }}
                    style={{
                      position: "absolute",
                      ...(fe.maximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : { left: fe.pos.x, top: fe.pos.y, width: feW, height: feH }),
                      borderRadius: fe.maximized ? 0 : 10,
                      borderTopLeftRadius: fe.maximized ? 12 : 10,
                      borderTopRightRadius: fe.maximized ? 12 : 10,
                      background: edBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.65)"
                        : "0 0 0 0.5px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.16)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: zIdx,
                      transition: fileEditorDragRef.current?.id === fe.id ? "none" : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
                      animation: fe.minimizing ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards" : "winIn 0.28s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Title bar */}
                    <div
                      onMouseDown={e => {
                        if (fe.maximized) return
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
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            setFileEditorWins(prev => prev.map(f => f.id === fe.id ? { ...f, maximized: true, pos: { x: f.pos.x, y: Math.max(f.pos.y, 28) } } : f))
                          }
                          fileEditorDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: titleH, flexShrink: 0, background: isDark ? "#2c2c2e" : "#ececec", borderBottom: `0.5px solid ${edDiv}`, display: "flex", alignItems: "center", position: "relative", userSelect: "none", cursor: fe.maximized ? "default" : "grab" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap3, paddingLeft: tlLeft3 }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, symClr: "#460804", fn: () => { setFileEditorWins(prev => prev.filter(f => f.id !== fe.id)); setWindowOrder(o => o.filter(k => k !== feKey)) } },
                          { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, symClr: "#90591d", fn: () => { setFileEditorWins(prev => prev.map(f => f.id === fe.id ? { ...f, minimizing: true } : f)); setTimeout(() => setFileEditorWins(prev => prev.map(f => f.id === fe.id ? { ...f, minimized: true, minimizing: false } : f)), 340) } },
                          { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, symClr: "#2a6218", fn: () => setFileEditorWins(prev => prev.map(f => f.id === fe.id ? { ...f, maximized: !f.maximized } : f)) },
                        ].map((btn, i) => (
                          <div key={i}
                            onClick={e => { e.stopPropagation(); btn.fn() }}
                            onMouseEnter={() => setFileEditorWins(prev => prev.map(f => f.id === fe.id ? { ...f, hoveredTl: i } : f))}
                            onMouseLeave={() => setFileEditorWins(prev => prev.map(f => f.id === fe.id ? { ...f, hoveredTl: -1 } : f))}
                            style={{ width: tlSz3, height: tlSz3, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <TrafficLightSymbol kind={btn.kind} color={btn.symClr} size={Math.round(tlSz3 * 0.84)} visible={fe.hoveredTl === i} />
                          </div>
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", gap: 5 }}>
                        <span style={{ fontSize: Math.round(w * 0.021), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.58)", fontFamily: "-apple-system,'SF Pro Text',sans-serif" }}>{fe.name}</span>
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
                        placeholder="Start typing..."
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
                    {!fe.maximized && <ResizeHandle
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        const startX = e.clientX
                        const startY = e.clientY
                        const startW = feW
                        const startH = feH
                        const minW = Math.round(w * 0.46)
                        const minH = Math.round(h * 0.36)
                        const maxW = Math.max(minW, (w - 20) - fe.pos.x)
                        const maxH = Math.max(minH, h - fe.pos.y)
                        const onMove = (ev: MouseEvent) => {
                          setFileEditorWins(prev => prev.map(f => f.id === fe.id ? {
                            ...f,
                            size: {
                              w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                              h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                            },
                          } : f))
                        }
                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                    />}
                  </div>
                )
              })}

              {/* Screen scrim - dims wallpaper when a window is open */}
              {(openWindows.some(w => !w.minimized) || (itunesOpen && !itunesMinimized)) && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 2,
                  background: "rgba(0,0,0,0.42)",
                  backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
                  pointerEvents: "none",
                  animation: "mbFade 0.3s ease",
                }} />
              )}

              {appSwitcherVisible && switchableWindows.length > 0 && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 14,
                    padding: `${Math.round(h * 0.02)}px ${Math.round(w * 0.02)}px`,
                    borderRadius: 24,
                    background: isDark ? "rgba(20,20,24,0.82)" : "rgba(245,247,250,0.82)",
                    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.18)"}`,
                    backdropFilter: "blur(24px) saturate(1.2)",
                    WebkitBackdropFilter: "blur(24px) saturate(1.2)",
                    boxShadow: isDark ? "0 28px 80px rgba(0,0,0,0.45)" : "0 28px 80px rgba(15,23,42,0.14)",
                    display: "flex",
                    alignItems: "center",
                    gap: Math.round(w * 0.018),
                    maxWidth: Math.round(w * 0.76),
                  }}
                >
                  {switchableWindows.map((item, idx) => {
                    const active = idx === appSwitcherIndex
                    return (
                      <div
                        key={`${item.label}-${String(item.key)}`}
                        style={{
                          width: Math.round(w * 0.112),
                          padding: `${Math.round(h * 0.012)}px ${Math.round(w * 0.008)}px`,
                          borderRadius: 18,
                          background: active
                            ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.82)")
                            : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.42)"),
                          border: `0.5px solid ${active
                            ? (isDark ? "rgba(255,255,255,0.18)" : "rgba(148,163,184,0.2)")
                            : (isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.12)")}`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: Math.round(h * 0.01),
                          boxShadow: active
                            ? (isDark ? "0 14px 30px rgba(0,0,0,0.26)" : "0 14px 30px rgba(15,23,42,0.08)")
                            : "none",
                          transform: active ? "translateY(-2px) scale(1.03)" : "scale(1)",
                          transition: "transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease",
                        }}
                      >
                        <div style={{
                          width: Math.round(w * 0.055),
                          height: Math.round(w * 0.055),
                          borderRadius: 16,
                          background: item.icon ? "transparent" : item.tone,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
                        }}>
                          {item.icon ? (
                            <img src={item.icon} alt={item.label} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          ) : (
                            <span style={{ color: "#fff", fontSize: Math.round(w * 0.016), fontWeight: 800, fontFamily: "-apple-system,'SF Pro Display',sans-serif" }}>
                              {item.label.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span style={{
                          width: "100%",
                          textAlign: "center",
                          fontSize: Math.round(w * 0.014),
                          fontWeight: active ? 700 : 600,
                          color: isDark ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
                          fontFamily: "-apple-system,'SF Pro Text',sans-serif",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {item.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* macOS menu bar */}
              {hovered && (() => {
                const mbH = Math.round(h * 0.036)
                const fs  = Math.round(w * 0.0155)
                return (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: mbH,
                    background: isDark ? "rgba(30,30,32,0.28)" : "rgba(255,255,255,0.16)",
                    backdropFilter: "blur(18px) saturate(1.45)",
                    WebkitBackdropFilter: "blur(18px) saturate(1.45)",
                    borderBottom: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "none",
                    boxShadow: isDark
                      ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 24px rgba(0,0,0,0.16)"
                      : "0 8px 24px rgba(148,163,184,0.08)",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: `${Math.round(mbH * 0.18)}px ${Math.round(w * 0.015)}px 0`,
                    zIndex: 15, pointerEvents: "none",
                    fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
                    fontSize: fs,
                    opacity: 1,
                    transform: "translateY(0) scaleY(1)",
                    filter: "blur(0px)",
                    transition: "background 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease",
                  }}>
                    {/* Left: logo + app/menu labels */}
                    <div style={{ display: "flex", alignItems: "center", gap: Math.round(w * 0.012) }}>
                      <img
                        src={isDark
                          ? "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775589104/image-removebg-preview_4_fhb1hw.png"
                          : "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775589008/image-removebg-preview_3_vidndh.png"}
                        alt="logo"
                        style={{ height: Math.round(w * 0.0165), width: "auto", display: "block" }}
                      />
                      <span style={{ fontWeight: 700, color: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)", fontSize: Math.round(w * 0.013), fontFamily: "'Iosevka Charon', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>Zakaria</span>
                      <div style={{ display: "flex", alignItems: "center", gap: Math.round(w * 0.012) }}>
                        {["File", "Edit", "View", "Go", "Window", "Help"].map((item) => (
                          <span
                            key={item}
                            style={{
                              fontWeight: 400,
                              color: isDark ? "rgba(255,255,255,0.84)" : "rgba(0,0,0,0.82)",
                              fontSize: Math.round(w * 0.0125),
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Right: control center + clock */}
                    <div style={{ display: "flex", alignItems: "center", gap: Math.round(w * 0.01), pointerEvents: "auto" }}>
                      <div
                        onClick={e => { e.stopPropagation(); setControlCenterOpen(o => !o) }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: Math.round(w * 0.03), height: Math.round(w * 0.03), borderRadius: Math.round(w * 0.006), background: controlCenterOpen ? "rgba(255,255,255,0.18)" : "transparent", transition: "background 0.15s" }}
                      >
                        <img src={isDark ? "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423308/control_centerfor_darkmode_yywvs0.gif" : "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775422540/controle_center_fzldo2.png"} alt="Control Center" draggable={false} style={{ width: Math.round(w * 0.023), height: Math.round(w * 0.023), objectFit: "contain", display: "block" }} />
                      </div>
                      <span style={{ color: isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.82)", fontWeight: 500, letterSpacing: 0.1, fontSize: Math.round(w * 0.013) }}>{clock}</span>
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

                    {/* Row 2: Notch - compact horizontal tile */}
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
                        switchWallpaper(WALLPAPERS[(idx + 1) % WALLPAPERS.length])
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
                      <div style={{ flexShrink: 0, borderRadius: Math.round(panW * 0.026), overflow: "hidden", width: Math.round(panW * 0.22), height: Math.round(panW * 0.14), boxShadow: "0 2px 8px rgba(0,0,0,0.3)", position: "relative" }}>
                        {prevWallpaper && (
                          <img
                            src={prevWallpaper}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: wallpaperTransitioning ? 0 : 1, transition: "opacity 0.52s ease" }}
                            draggable={false}
                          />
                        )}
                        <img src={wallpaper} style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: fsPx(13), fontWeight: 600, fontFamily: ff, color: textPri, lineHeight: "1.3" }}>Wallpaper</div>
                        <div style={{ fontSize: fsPx(11), fontWeight: 400, fontFamily: ff, color: textSec, marginTop: 1 }}>Click to change</div>
                      </div>
                      <div style={{ marginLeft: "auto", color: textSec, fontSize: fsPx(16), lineHeight: 1, flexShrink: 0 }}>{">"}</div>
                    </div>
                  </div>
                )
              })()}

              {/* App Windows - one per open project */}
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
                  const winW   = win.size.w || baseWinW
                  const winH   = win.size.h || baseWinH
                  const winTop  = baseWinTop  + win.pos.y
                  const winLeft = baseWinLeft + win.pos.x
                  // const btnSz  = Math.round(winW * 0.046)
                  const tlSz   = Math.round(titleH * 0.54)
                  const tlGap  = Math.round(titleH * 0.45)
                  const tlLeft = Math.round(titleH * 0.64)
                  const tl = [
                    { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, symClr: "#460804",
                      fn: () => closeWindow(win.id) },
                    { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, symClr: "#90591d",
                      fn: () => { updateWin(win.id, { minimizing: true }); setTimeout(() => updateWin(win.id, { minimized: true, minimizing: false }), 340) } },
                    { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, symClr: "#2a6218",
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
                      borderTopLeftRadius: win.maximized ? 12 : 10,
                      borderTopRightRadius: win.maximized ? 12 : 10,
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
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            updateWin(win.id, { maximized: true, pos: { x: win.pos.x, y: Math.max(win.pos.y, 0) } })
                          }
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
                            <TrafficLightSymbol
                              kind={btn.kind}
                              color={btn.symClr}
                              size={Math.round(tlSz * 0.84)}
                              visible={win.hoveredTl === i}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none",
                      }}>
                        <span style={{
                          fontSize: Math.round(w * 0.018), fontWeight: 500,
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
                            <span onClick={e => { e.stopPropagation(); openSafariUrl(pLiveUrl) }}
                              style={{ fontSize: Math.round(w * 0.019), color: "#0a84ff", cursor: "pointer", fontFamily: "-apple-system,sans-serif" }}>? Live</span>
                          )}
                          {pHasGit && (
                            <span onClick={e => { e.stopPropagation(); window.open(pGitUrl, "_blank", "noopener,noreferrer") }}
                              style={{ fontSize: Math.round(w * 0.019), color: textSec, cursor: "pointer", fontFamily: "-apple-system,sans-serif" }}>? GitHub</span>
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
                    {!win.maximized && (
                      <ResizeHandle
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const startX = e.clientX
                          const startY = e.clientY
                          const startW = winW
                          const startH = winH
                          const minW = Math.round(w * 0.56)
                          const minH = Math.round(h * 0.42)
                          const maxW = Math.max(minW, (w - 20) - winLeft)
                          const maxH = Math.max(minH, h - winTop)
                          const onMove = (ev: MouseEvent) => {
                            updateWin(win.id, {
                              size: {
                                w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                                h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                              },
                            })
                          }
                          const onUp = () => {
                            window.removeEventListener("mousemove", onMove)
                            window.removeEventListener("mouseup", onUp)
                          }
                          window.addEventListener("mousemove", onMove)
                          window.addEventListener("mouseup", onUp)
                        }}
                      />
                    )}
                  </div>
                  )
                })
              })()}

              {/* Terminal - standalone macOS window, same chrome as project windows */}
              {terminalOpen && !termMinimized && (() => {
                const mbH2    = Math.round(h * 0.036)
                const availH2 = h - mbH2
                const tw      = termSize.w || Math.round(w * 0.68)
                const th      = termSize.h || Math.round(availH2 * 0.62)
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
                    onClick={() => { setControlCenterOpen(false); setWindowOrder(o => [...o.filter(k => k !== "terminal"), "terminal"]) }}
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
                      borderTopLeftRadius: termMaximized ? 12 : 10,
                      borderTopRightRadius: termMaximized ? 12 : 10,
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
                      transition: termDragRef.current ? "none" : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
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
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            setTermPos(pos => ({ x: pos.x, y: Math.max(pos.y, 0) }))
                            setTermMaximized(true)
                          }
                          termDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
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
                          { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, symClr: "#460804",
                            fn: () => { setTerminalOpen(false); setTermLines([]); setTermInput(""); setTermPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "terminal")) } },
                          { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, symClr: "#90591d",
                            fn: () => { setTermMinimizing(true); setTimeout(() => { setTermMinimized(true); setTermMinimizing(false) }, 340) } },
                          { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, symClr: "#2a6218",
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
                            <TrafficLightSymbol
                              kind={btn.kind}
                              color={btn.symClr}
                              size={Math.round(tlSz2 * 0.84)}
                              visible={hoveredTermTl === i}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: Math.round(w * 0.018), fontWeight: 500, color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)", letterSpacing: -0.1, fontFamily: "-apple-system,'SF Pro Text',sans-serif" }}>
                          {proj?.title ? `${proj.title} - zsh` : "Terminal - zsh"}
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
                        fontSize: Math.round(w * 0.0165), lineHeight: 1.5,
                      }}
                    >
                      {termLines.map((line, i) => (
                        line.helpSection ? (
                          <div key={i} style={{ padding: `${Math.round(w * 0.004)}px 0 ${Math.round(w * 0.003)}px`, fontSize: Math.round(w * 0.014), lineHeight: 1.35 }}>
                            <span style={{ color: "#bf5af2", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
                              {line.helpSection}
                            </span>
                          </div>
                        ) : line.helpRow ? (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              flexWrap: "wrap" as const,
                              alignItems: "baseline",
                              gap: `${Math.round(w * 0.006)}px ${Math.round(w * 0.014)}px`,
                              paddingBottom: 2,
                              fontSize: Math.round(w * 0.0155),
                              lineHeight: 1.4,
                            }}
                          >
                            <span style={{ color: "#64d2ff", fontWeight: 700, flex: "0 0 5.5em" }}>{line.helpRow.cmd}</span>
                            <span style={{ color: "#ffd60a", flex: "0 1 9.5em", minWidth: 0 }}>{line.helpRow.args || "-"}</span>
                            <span style={{ color: isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.58)", flex: "1 1 12em", minWidth: 0 }}>{line.helpRow.desc}</span>
                          </div>
                        ) : line.parts ? (
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
                        <span style={{ color: termPrompt, fontWeight: 700, marginRight: 4 }}>$</span>
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
                    {!termMaximized && (
                      <ResizeHandle
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const startX = e.clientX
                          const startY = e.clientY
                          const startW = tw
                          const startH = th
                          const termLeft = tLeft + termPos.x
                          const termTop = tTop + termPos.y
                          const minW = Math.round(w * 0.44)
                          const minH = Math.round(h * 0.3)
                          const maxW = Math.max(minW, (w - 20) - termLeft)
                          const maxH = Math.max(minH, h - termTop)
                          const onMove = (ev: MouseEvent) => {
                            setTermSize({
                              w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                              h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                            })
                          }
                          const onUp = () => {
                            window.removeEventListener("mousemove", onMove)
                            window.removeEventListener("mouseup", onUp)
                          }
                          window.addEventListener("mousemove", onMove)
                          window.addEventListener("mouseup", onUp)
                        }}
                      />
                    )}
                  </div>
                )
              })()}

              {/* Closing animation - exit layer over wallpaper */}
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

              {/* Messages Window */}
              {messagesOpen && !messagesMinimized && (() => {
                const mbH = Math.round(h * 0.036)
                const mw = messagesSize.w || Math.round(w * 0.78)
                const mh = messagesSize.h || Math.round(h * 0.74)
                const baseTop = mbH + Math.round((h - mbH - mh) * 0.12)
                const baseLeft = Math.round((w - mw) / 2)
                const tlSz = Math.round(22 * 0.54)
                const tlGap = Math.round(22 * 0.45)
                const tlLeft = Math.round(22 * 0.64)
                const titleH = Math.round(mh * 0.09)
                const sideW = Math.round(mw * 0.29)
                const ff = "-apple-system,'SF Pro Text',BlinkMacSystemFont,sans-serif"
                const bodyBg = isDark ? "#16171b" : "#f5f6f8"
                const titleBg = isDark ? "rgba(47,47,52,0.92)" : "rgba(250,251,253,0.92)"
                const divider = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)"
                const textPrimary = isDark ? "rgba(255,255,255,0.94)" : "rgba(15,23,42,0.95)"
                const textSecondary = isDark ? "rgba(255,255,255,0.48)" : "rgba(71,85,105,0.74)"
                const zIdx = 3 + (windowOrder.indexOf("messages") >= 0 ? windowOrder.indexOf("messages") : 0)

                return (
                  <div
                    onClick={e => { e.stopPropagation(); bringToFront("messages"); setFocusedWinId(null) }}
                    style={{
                      position: "absolute",
                      ...(messagesMaximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : { top: baseTop + messagesPos.y, left: baseLeft + messagesPos.x, width: mw, height: mh }),
                      borderRadius: messagesMaximized ? 0 : 10,
                      borderTopLeftRadius: messagesMaximized ? 12 : 10,
                      borderTopRightRadius: messagesMaximized ? 12 : 10,
                      overflow: "hidden",
                      background: bodyBg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.72)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 18px 48px rgba(0,0,0,0.62), 0 32px 80px rgba(0,0,0,0.52)"
                        : "0 0 0 0.5px rgba(148,163,184,0.16), 0 18px 48px rgba(15,23,42,0.12), 0 32px 80px rgba(15,23,42,0.08)",
                      display: "flex",
                      flexDirection: "column",
                      zIndex: zIdx,
                      animation: messagesMinimizing
                        ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                        : "winIn 0.32s cubic-bezier(0.22,1,0.36,1)",
                      transition: messagesDragRef.current ? "none" : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
                    }}
                  >
                    <div
                      onMouseDown={e => {
                        if (messagesMaximized) return
                        e.preventDefault()
                        messagesDragRef.current = { startX: e.clientX, startY: e.clientY, ox: messagesPos.x, oy: messagesPos.y }
                        const onMove = (ev: MouseEvent) => {
                          const d = messagesDragRef.current
                          if (!d) return
                          setMessagesPos({ x: d.ox + ev.clientX - d.startX, y: d.oy + ev.clientY - d.startY })
                        }
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            setMessagesPos(pos => ({ x: pos.x, y: Math.max(pos.y, 0) }))
                            setMessagesMaximized(true)
                          }
                          messagesDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}
                      style={{
                        height: titleH,
                        flexShrink: 0,
                        background: titleBg,
                        borderBottom: `0.5px solid ${divider}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        userSelect: "none",
                        cursor: messagesMaximized ? "default" : "grab",
                        backdropFilter: "blur(18px) saturate(1.25)",
                        WebkitBackdropFilter: "blur(18px) saturate(1.25)",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: tlGap, paddingLeft: tlLeft, flexShrink: 0 }}
                        onMouseLeave={() => setHoveredMessagesTl(-1)}
                      >
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, fn: () => { setMessagesOpen(false); setMessagesMinimized(false); setMessagesMaximized(false); setMessagesPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "messages")) } },
                          { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, fn: () => { setMessagesMinimizing(true); setTimeout(() => { setMessagesMinimized(true); setMessagesMinimizing(false) }, 340) } },
                          { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, fn: () => { setMessagesMaximized(m => !m); setMessagesMinimized(false) } },
                        ].map((btn, i) => (
                          <div
                            key={i}
                            onClick={e => { e.stopPropagation(); btn.fn() }}
                            onMouseEnter={() => setHoveredMessagesTl(i)}
                            onMouseLeave={() => setHoveredMessagesTl(-1)}
                            style={{ width: tlSz, height: tlSz, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <TrafficLightSymbol kind={btn.kind} color="rgba(0,0,0,0.55)" size={Math.round(tlSz * 0.84)} visible={hoveredMessagesTl === i} />
                          </div>
                        ))}
                      </div>
                      <div />
                      <div style={{ width: Math.round(w * 0.1) }} />
                    </div>

                    <div style={{ flex: 1, display: "flex", minHeight: 0, background: bodyBg }}>
                      <div style={{ width: sideW, flexShrink: 0, background: isDark ? "linear-gradient(180deg, rgba(44,45,50,0.94), rgba(31,32,36,0.92))" : "linear-gradient(180deg, rgba(246,247,249,0.88), rgba(234,236,240,0.72))", borderRight: `0.5px solid ${divider}`, display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: `${Math.round(mh * 0.022)}px ${Math.round(mw * 0.02)}px ${Math.round(mh * 0.014)}px`, borderBottom: `0.5px solid ${divider}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: Math.round(mh * 0.018) }}>
                            <div style={{ fontSize: Math.round(w * 0.012), fontWeight: 600, color: textSecondary as string, fontFamily: ff }}>Messages</div>
                            <button type="button" style={{ border: "none", background: "transparent", color: textSecondary as string, padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <PencilLine size={Math.round(w * 0.017)} strokeWidth={1.9} />
                            </button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, border: `0.5px solid ${divider}`, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)", padding: `${Math.round(mh * 0.01)}px ${Math.round(mw * 0.014)}px`, boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }}>
                            <Search size={Math.round(w * 0.015)} color={textSecondary as string} strokeWidth={1.9} />
                            <input value={messagesSearch} onChange={(e) => setMessagesSearch(e.target.value)} placeholder="Search" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: Math.round(w * 0.013), color: textPrimary as string, fontFamily: ff }} />
                          </div>
                        </div>
                        <div style={{ overflowY: "auto", flex: 1 }}>
                          {messagesConversation.name.toLowerCase().includes(messagesSearch.toLowerCase()) && (
                            <button type="button" style={{ width: "100%", display: "flex", alignItems: "center", gap: Math.round(mw * 0.014), padding: `${Math.round(mh * 0.018)}px ${Math.round(mw * 0.016)}px`, textAlign: "left", border: "none", borderBottom: `0.5px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.42)" }}>
                              <div style={{ width: Math.round(mw * 0.052), height: Math.round(mw * 0.052), borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6 0%,#22d3ee 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: Math.round(w * 0.015), fontWeight: 700, fontFamily: ff, flexShrink: 0 }}>Z</div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                  <span style={{ fontSize: Math.round(w * 0.0135), fontWeight: 600, color: textPrimary as string, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{messagesConversation.name}</span>
                                  <span style={{ fontSize: Math.round(w * 0.0108), color: textSecondary as string, fontFamily: ff }}>{messagesConversation.messages[messagesConversation.messages.length - 1]?.time}</span>
                                </div>
                                <div style={{ marginTop: 2, fontSize: Math.round(w * 0.0128), color: textSecondary as string, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{messagesConversation.messages[messagesConversation.messages.length - 1]?.text}</div>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: isDark ? "rgba(24,25,29,0.82)" : "rgba(255,255,255,0.82)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `0.5px solid ${divider}`, background: isDark ? "rgba(24,25,29,0.72)" : "rgba(255,255,255,0.55)", padding: `${Math.round(mh * 0.017)}px ${Math.round(mw * 0.026)}px`, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button type="button" style={{ border: "none", background: "transparent", color: textSecondary as string, padding: 6, borderRadius: 999, display: "flex" }}>
                              <ChevronLeft size={Math.round(w * 0.018)} strokeWidth={1.9} />
                            </button>
                            <div>
                              <div style={{ fontSize: Math.round(w * 0.0115), color: textSecondary as string, fontFamily: ff }}>To:</div>
                              <div style={{ fontSize: Math.round(w * 0.0145), fontWeight: 600, color: textPrimary as string, fontFamily: ff }}>{messagesConversation.name}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {[Camera, Video, Info].map((Icon, index) => (
                              <button key={index} type="button" style={{ border: "none", background: "transparent", color: textSecondary as string, padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon size={Math.round(w * 0.017)} strokeWidth={1.9} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div ref={messagesBodyRef} style={{ flex: 1, overflowY: "auto", background: isDark ? "linear-gradient(180deg, rgba(24,25,29,0.94), rgba(20,21,25,0.98))" : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,248,250,0.96))", padding: `${Math.round(mh * 0.026)}px ${Math.round(mw * 0.028)}px` }}>
                          <div style={{ maxWidth: Math.round(mw * 0.62), margin: "0 auto", display: "flex", flexDirection: "column", gap: Math.round(mh * 0.018) }}>
                            {messagesConversation.messages.map((message) => (
                              <div key={message.id} style={{ display: "flex", justifyContent: message.fromMe ? "flex-end" : "flex-start" }}>
                                <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", alignItems: message.fromMe ? "flex-end" : "flex-start", gap: 4 }}>
                                  <div style={{ padding: `${Math.round(mh * 0.012)}px ${Math.round(mw * 0.018)}px`, fontSize: Math.round(w * 0.014), lineHeight: 1.45, fontFamily: ff, boxShadow: "0 1px 2px rgba(0,0,0,0.06)", ...(message.fromMe ? { borderRadius: "18px 18px 6px 18px", background: "#0A84FF", color: "#fff" } : { borderRadius: "18px 18px 18px 6px", background: isDark ? "rgba(255,255,255,0.1)" : "#ECECEC", color: isDark ? "rgba(255,255,255,0.94)" : "#1f1f1f" }) }}>
                                    {message.text}
                                  </div>
                                  <span style={{ padding: "0 4px", fontSize: Math.round(w * 0.011), color: isDark ? "rgba(255,255,255,0.38)" : "#a1a1aa", fontFamily: ff }}>{message.time}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ borderTop: `0.5px solid ${divider}`, background: isDark ? "rgba(24,25,29,0.72)" : "rgba(255,255,255,0.6)", padding: `${Math.round(mh * 0.016)}px ${Math.round(mw * 0.026)}px`, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
                          <div style={{ maxWidth: Math.round(mw * 0.62), margin: "0 auto", display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)", padding: `${Math.round(mh * 0.008)}px ${Math.round(mw * 0.012)}px`, boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.65)" }}>
                            <button type="button" style={{ border: "none", background: "transparent", color: textSecondary as string, padding: 8, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Plus size={Math.round(w * 0.017)} strokeWidth={1.9} />
                            </button>
                            <textarea rows={1} value={messagesDraft} onChange={(e) => setMessagesDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }} placeholder="iMessage" style={{ maxHeight: 110, minHeight: 24, width: "100%", resize: "none", border: "none", outline: "none", background: "transparent", padding: "0 8px", fontSize: Math.round(w * 0.014), color: isDark ? "rgba(255,255,255,0.88)" : "#3f3f46", fontFamily: ff }} />
                            <button type="button" style={{ border: "none", background: "transparent", color: textSecondary as string, padding: 8, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Smile size={Math.round(w * 0.017)} strokeWidth={1.9} />
                            </button>
                            <button type="button" style={{ border: "none", background: "transparent", color: textSecondary as string, padding: 8, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Mic size={Math.round(w * 0.017)} strokeWidth={1.9} />
                            </button>
                            <button type="button" onClick={handleSendMessage} disabled={!messagesDraft.trim()} style={{ border: "none", background: "#0A84FF", color: "#fff", padding: 10, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(10,132,255,0.28)", opacity: messagesDraft.trim() ? 1 : 0.5, cursor: messagesDraft.trim() ? "pointer" : "default" }}>
                              <Send size={Math.round(w * 0.015)} strokeWidth={2.1} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {!messagesMaximized && (
                      <ResizeHandle
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const startX = e.clientX
                          const startY = e.clientY
                          const startW = mw
                          const startH = mh
                          const winLeft = baseLeft + messagesPos.x
                          const winTop = baseTop + messagesPos.y
                          const minW = Math.round(w * 0.5)
                          const minH = Math.round(h * 0.42)
                          const maxW = Math.max(minW, (w - 20) - winLeft)
                          const maxH = Math.max(minH, h - winTop)
                          const onMove = (ev: MouseEvent) => {
                            setMessagesSize({
                              w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                              h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                            })
                          }
                          const onUp = () => {
                            window.removeEventListener("mousemove", onMove)
                            window.removeEventListener("mouseup", onUp)
                          }
                          window.addEventListener("mousemove", onMove)
                          window.addEventListener("mouseup", onUp)
                        }}
                      />
                    )}
                  </div>
                )
              })()}

              {/* Safari Window */}
              {safariOpen && !safariMinimized && (() => {
                const mbH   = Math.round(h * 0.036)
                const sw2   = safariSize.w || Math.round(w * 0.9)
                const sh2   = safariSize.h || Math.round(h * 0.82)
                const baseTop  = mbH + Math.round((h - mbH - sh2) * 0.1)
                const screenW2 = w - 20
                const baseLeft = Math.round((screenW2 - sw2) / 2)
                const tlSz  = Math.round(22 * 0.54)
                const tlGap = Math.round(22 * 0.45)
                const tlLeft = Math.round(22 * 0.64)
                const toolbarH = Math.round(sh2 * 0.078)
                const tabH     = Math.round(sh2 * 0.062)
                const bg    = isDark ? "#2b2b2f" : "#eef2f7"
                const toolBg = isDark ? "rgba(36,36,40,0.9)" : "rgba(246,248,251,0.88)"
                const inputBg = isDark ? "rgba(22,22,24,0.9)" : "rgba(241,245,249,0.96)"
                const divClr  = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)"
                const textPrimary = isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.85)"
                const textSec     = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)"
                const panelBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)"
                const glassBg = isDark ? "rgba(24,28,35,0.76)" : "rgba(248,251,255,0.78)"
                const ff = "-apple-system,'SF Pro Text',BlinkMacSystemFont,sans-serif"
                const fs = (n: number) => Math.round(sw2 * n)
                const projectSuggestions = (projects ?? []).flatMap((project) => {
                  const entries: { label: string; url: string; meta: string; icon: string }[] = []
                  if (project.liveUrl && project.liveUrl !== "#") {
                    entries.push({
                      label: project.title ?? "Project",
                      url: project.liveUrl,
                      meta: "Live",
                      icon: "↗",
                    })
                  }
                  if (project.githubUrl && project.githubUrl !== "#") {
                    entries.push({
                      label: `${project.title ?? "Project"} GitHub`,
                      url: project.githubUrl,
                      meta: "GitHub",
                      icon: "GH",
                    })
                  }
                  return entries
                })
                const safariQuery = safariInput.trim().toLowerCase()
                const websiteSuggestion = (() => {
                  const raw = safariInput.trim()
                  if (!raw || /\s/.test(raw) || /^https?:\/\//i.test(raw) || raw.includes("/")) return null
                  const normalized = raw.includes(".") ? raw : `${raw}.com`
                  const url = normalized.startsWith("http") ? normalized : `https://${normalized}`
                  return {
                    label: normalized,
                    url,
                    meta: "Website",
                    icon: ".com",
                  }
                })()
                const safariSuggestions = [
                  ...(websiteSuggestion ? [websiteSuggestion] : []),
                  ...(safariQuery
                  ? projectSuggestions.filter((entry) => (
                      entry.label.toLowerCase().includes(safariQuery) ||
                      entry.url.toLowerCase().includes(safariQuery) ||
                      entry.meta.toLowerCase().includes(safariQuery)
                    ))
                  : projectSuggestions
                ),
                ]
                  .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.url === entry.url) === index)
                  .slice(0, 6)
                const activeSafariTab = safariTabs.find(tab => tab.id === activeSafariTabId)
                const canGoBack = (activeSafariTab?.historyIndex ?? 0) > 0
                const canGoForward = activeSafariTab ? activeSafariTab.historyIndex < activeSafariTab.history.length - 1 : false
                const navigate = (raw: string) => {
                  openSafariUrl(raw)
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
                      borderRadius: safariMaximized ? 0 : 14,
                      borderTopLeftRadius: safariMaximized ? 12 : 14,
                      borderTopRightRadius: safariMaximized ? 12 : 14,
                      background: bg,
                      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.65)"}`,
                      boxShadow: isDark
                        ? "0 0 0 0.5px rgba(0,0,0,0.9), 0 18px 48px rgba(0,0,0,0.62), 0 32px 80px rgba(0,0,0,0.52)"
                        : "0 0 0 0.5px rgba(148,163,184,0.16), 0 18px 48px rgba(15,23,42,0.12), 0 32px 80px rgba(15,23,42,0.08)",
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      zIndex: 3 + (windowOrder.indexOf("safari") >= 0 ? windowOrder.indexOf("safari") : 0),
                      animation: safariMinimizing
                        ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                        : "winIn 0.32s cubic-bezier(0.22,1,0.36,1)",
                      transition: safariDragRef.current ? "none" : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
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
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            setSafariPos(pos => ({ x: pos.x, y: Math.max(pos.y, 0) }))
                            setSafariMaximized(true)
                          }
                          safariDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp)
                      }}
                      style={{ height: toolbarH, flexShrink: 0, background: toolBg, borderBottom: `0.5px solid ${divClr}`, display: "flex", alignItems: "center", gap: Math.round(sw2 * 0.01), paddingRight: Math.round(sw2 * 0.015), userSelect: "none", cursor: "grab", backdropFilter: "blur(18px) saturate(1.25)", WebkitBackdropFilter: "blur(18px) saturate(1.25)", overflow: "visible", zIndex: 6 }}
                    >
                      {/* Traffic lights */}
                      <div style={{ display: "flex", alignItems: "center", gap: tlGap, paddingLeft: tlLeft, flexShrink: 0 }}>
                        {[
                          { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, symClr: "rgba(0,0,0,0.55)", fn: () => { setSafariOpen(false); setSafariMinimized(false); setSafariMaximized(false); setSafariPos({ x: 0, y: 0 }); setSafariInputFocused(false); setWindowOrder(o => o.filter(k => k !== "safari")) } },
                          { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, symClr: "rgba(0,0,0,0.55)", fn: () => { setSafariMinimizing(true); setTimeout(() => { setSafariMinimized(true); setSafariMinimizing(false) }, 340) } },
                          { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, symClr: "rgba(0,0,0,0.55)", fn: () => { setSafariMaximized(m => !m); setSafariMinimized(false) } },
                        ].map((btn, i) => (
                          <div key={i} onClick={e => { e.stopPropagation(); btn.fn() }}
                            onMouseEnter={() => setSafariHoveredTl(i)}
                            onMouseLeave={() => setSafariHoveredTl(-1)}
                            style={{ width: tlSz, height: tlSz, borderRadius: "50%", background: btn.fill, border: `0.5px solid ${btn.border}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <TrafficLightSymbol
                              kind={btn.kind}
                              color={btn.symClr}
                              size={Math.round(tlSz * 0.84)}
                              visible={safariHoveredTl === i}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: Math.round(sw2 * 0.006), flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            if (!canGoBack) return
                            setSafariTabs(tabs => tabs.map(tab => {
                              if (tab.id !== activeSafariTabId || tab.historyIndex <= 0) return tab
                              const nextIndex = tab.historyIndex - 1
                              return { ...tab, historyIndex: nextIndex, url: tab.history[nextIndex] ?? "" }
                            }))
                          }}
                          style={{ border: "none", background: "transparent", color: canGoBack ? textSec as string : (isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"), padding: 0, width: Math.round(sw2 * 0.022), height: Math.round(sw2 * 0.022), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: canGoBack ? "pointer" : "default" }}
                        >
                          <svg width={Math.round(sw2 * 0.014)} height={Math.round(sw2 * 0.014)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M12.5 5.5 7.5 10l5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            if (!canGoForward) return
                            setSafariTabs(tabs => tabs.map(tab => {
                              if (tab.id !== activeSafariTabId || tab.historyIndex >= tab.history.length - 1) return tab
                              const nextIndex = tab.historyIndex + 1
                              return { ...tab, historyIndex: nextIndex, url: tab.history[nextIndex] ?? "" }
                            }))
                          }}
                          style={{ border: "none", background: "transparent", color: canGoForward ? textSec as string : (isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"), padding: 0, width: Math.round(sw2 * 0.022), height: Math.round(sw2 * 0.022), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: canGoForward ? "pointer" : "default" }}
                        >
                          <svg width={Math.round(sw2 * 0.014)} height={Math.round(sw2 * 0.014)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M7.5 5.5 12.5 10l-5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                      {/* URL bar */}
                      <div style={{ flex: 1, position: "relative", zIndex: 12 }} onMouseDown={e => { e.stopPropagation(); setSafariInputFocused(true) }}>
                      <div style={{ height: Math.round(toolbarH * 0.82), background: inputBg, borderRadius: Math.round(toolbarH * 0.22), display: "flex", alignItems: "center", paddingLeft: Math.round(sw2 * 0.015), paddingRight: Math.round(sw2 * 0.012), gap: Math.round(sw2 * 0.008), border: `0.5px solid ${divClr}`, boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.85)" }} onMouseDown={e => e.stopPropagation()}>
                        <svg width={Math.round(sw2 * 0.014)} height={Math.round(sw2 * 0.014)} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill={textSec as string} />
                        </svg>
                        <input
                          ref={safariInputRef}
                          value={safariInput}
                          onChange={e => setSafariInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") navigate(safariInput) }}
                          onFocus={e => { setSafariInputFocused(true); e.target.select() }}
                          onBlur={() => setTimeout(() => setSafariInputFocused(false), 120)}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                          placeholder="Search or enter website name"
                          style={{ flex: 1, height: "100%", background: "transparent", border: "none", outline: "none", fontSize: Math.round(sw2 * 0.016), fontFamily: ff, color: textPrimary as string, caretColor: "#0a84ff" }}
                        />
                        {safariInput && (
                          <div onClick={e => { e.stopPropagation(); setSafariInput("") }} onMouseDown={e => e.stopPropagation()} style={{ cursor: "pointer", color: textSec as string, fontSize: Math.round(sw2 * 0.018), lineHeight: 1 }}>x</div>
                        )}
                      </div>
                      {safariInputFocused && safariSuggestions.length > 0 && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: `calc(100% + ${Math.round(sw2 * 0.008)}px)`,
                            left: 0,
                            right: 0,
                            background: isDark ? "rgba(28,28,30,0.94)" : "rgba(255,255,255,0.94)",
                            backdropFilter: "blur(18px) saturate(1.3)",
                            WebkitBackdropFilter: "blur(18px) saturate(1.3)",
                            border: `0.5px solid ${divClr}`,
                            borderRadius: Math.round(sw2 * 0.016),
                            boxShadow: isDark
                              ? "0 18px 42px rgba(0,0,0,0.42)"
                              : "0 18px 42px rgba(15,23,42,0.12)",
                            overflow: "hidden",
                            maxHeight: Math.round(sh2 * 0.26),
                            overflowY: "auto",
                            zIndex: 40,
                          }}
                        >
                          <div style={{
                            padding: `${Math.round(sh2 * 0.01)}px ${Math.round(sw2 * 0.016)}px ${Math.round(sh2 * 0.008)}px`,
                            fontSize: Math.round(sw2 * 0.0115),
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                            color: textSec as string,
                            fontFamily: ff,
                            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.92)",
                            borderBottom: `0.5px solid ${divClr}`,
                          }}>
                            Suggested Results
                          </div>
                          {safariSuggestions.map((entry, idx) => (
                            <div
                              key={`${entry.meta}-${entry.url}-${idx}`}
                              onMouseDown={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSafariInput(entry.url)
                                setSafariInputFocused(false)
                                navigate(entry.url)
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: Math.round(sw2 * 0.012),
                                padding: `${Math.round(sh2 * 0.013)}px ${Math.round(sw2 * 0.016)}px`,
                                cursor: "pointer",
                                borderTop: idx === 0 ? "none" : `0.5px solid ${divClr}`,
                              }}
                            >
                              <div style={{
                                width: Math.round(sw2 * 0.028),
                                height: Math.round(sw2 * 0.028),
                                borderRadius: 8,
                                flexShrink: 0,
                                background: entry.meta === "GitHub"
                                  ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)")
                                  : "rgba(10,132,255,0.12)",
                                border: `0.5px solid ${entry.meta === "GitHub"
                                  ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)")
                                  : "rgba(10,132,255,0.18)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: entry.meta === "GitHub"
                                  ? (isDark ? "rgba(255,255,255,0.86)" : "rgba(15,23,42,0.82)")
                                  : "#0a84ff",
                                fontSize: Math.round(sw2 * 0.0125),
                                fontWeight: 700,
                                fontFamily: ff,
                              }}>
                                {entry.icon}
                              </div>
                              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontSize: Math.round(sw2 * 0.015), fontWeight: 600, color: textPrimary as string, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {entry.label}
                                </span>
                                <span style={{ fontSize: Math.round(sw2 * 0.0125), color: textSec as string, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {entry.url}
                                </span>
                              </div>
                              <span style={{ flexShrink: 0, fontSize: Math.round(sw2 * 0.0125), fontWeight: 700, color: isDark ? "#a5f3fc" : "#0369a1", fontFamily: ff }}>
                                {entry.meta}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      </div>
                      <div
                        onClick={e => {
                          e.stopPropagation()
                          if (safariUrl) window.open(safariUrl, "_blank", "noopener,noreferrer")
                        }}
                        style={{
                          padding: `0 ${Math.round(sw2 * 0.012)}px`,
                          height: Math.round(toolbarH * 0.46),
                          borderRadius: 999,
                          background: safariUrl ? "#0a84ff" : panelBg,
                          border: `0.5px solid ${safariUrl ? "#0a84ff" : divClr}` ,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: safariUrl ? "#fff" : textSec as string,
                          fontSize: Math.round(sw2 * 0.0135),
                          fontWeight: 700,
                          fontFamily: ff,
                          cursor: safariUrl ? "pointer" : "default",
                          boxShadow: safariUrl ? "0 10px 20px rgba(10,132,255,0.22)" : "none",
                        }}
                      >
                        Open In Browser
                      </div>
                      {/* Share button */}
                      <div style={{ width: Math.round(sw2 * 0.034), height: Math.round(sw2 * 0.034), display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", flexShrink: 0, borderRadius: 999, background: panelBg, border: `0.5px solid ${divClr}` }}>
                        <svg width={Math.round(sw2 * 0.022)} height={Math.round(sw2 * 0.022)} viewBox="0 0 24 24" fill="none">
                          <path d="M12 2v12M8 6l4-4 4 4M4 16v4h16v-4" stroke={textSec as string} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    {/* Tab bar */}
                    <div style={{ height: Math.round(tabH * 1.18), flexShrink: 0, background: toolBg, borderBottom: `0.5px solid ${divClr}`, display: "flex", alignItems: "center", paddingLeft: Math.round(sw2 * 0.014), paddingRight: Math.round(sw2 * 0.014), gap: Math.round(sw2 * 0.009), backdropFilter: "blur(18px) saturate(1.15)", WebkitBackdropFilter: "blur(18px) saturate(1.15)" }}>
                      {safariTabs.map(tab => {
                        const isActiveTab = tab.id === activeSafariTabId
                        const tabLabel = tab.url
                          ? (() => {
                              try {
                                return new URL(tab.url.startsWith("http") ? tab.url : "https://" + tab.url).hostname.replace(/^www\./, "")
                              } catch {
                                return "Safari"
                              }
                            })()
                          : "New Tab"
                        const tabIcon = tab.url
                          ? (() => {
                              try {
                                const href = tab.url.startsWith("http") ? tab.url : "https://" + tab.url
                                return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(href)}`
                              } catch {
                                return "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp"
                              }
                            })()
                          : "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp"
                        return (
                          <div
                            key={tab.id}
                            onClick={e => {
                              e.stopPropagation()
                              setActiveSafariTabId(tab.id)
                              setSafariInputFocused(!tab.url)
                            }}
                            style={{
                              height: Math.round(tabH * 0.92),
                              paddingLeft: Math.round(sw2 * 0.014),
                              paddingRight: Math.round(sw2 * 0.01),
                              background: isActiveTab
                                ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)")
                                : (isDark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.56)"),
                              borderRadius: Math.round(tabH * 0.2),
                              display: "flex",
                              alignItems: "center",
                              gap: Math.round(sw2 * 0.01),
                              minWidth: Math.round(sw2 * 0.19),
                              maxWidth: Math.round(sw2 * 0.28),
                              border: `0.5px solid ${isActiveTab ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.18)") : divClr}`,
                              boxShadow: isActiveTab
                                ? (isDark ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.18)" : "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(15,23,42,0.06)")
                                : (isDark ? "inset 0 1px 0 rgba(255,255,255,0.02)" : "inset 0 1px 0 rgba(255,255,255,0.6)"),
                              cursor: "pointer",
                              transition: "background 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                            }}
                          >
                            <img src={tabIcon} style={{ width: Math.round(tabH * 0.42), height: Math.round(tabH * 0.42), borderRadius: 4, flexShrink: 0 }} draggable={false} />
                            <span style={{ fontSize: fs(0.0155), fontWeight: 600, fontFamily: ff, color: textPrimary as string, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.1 }}>{tabLabel}</span>
                            <button
                              type="button"
                              aria-label="Close tab"
                              style={{ width: Math.round(tabH * 0.5), height: Math.round(tabH * 0.5), minWidth: Math.round(tabH * 0.5), borderRadius: 0, border: "none", background: "transparent", color: textSec as string, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
                              onClick={e => {
                                e.stopPropagation()
                                setSafariTabs(currentTabs => {
                                  if (currentTabs.length === 1) {
                                    setSafariOpen(false)
                                    setSafariMinimized(false)
                                    setSafariMaximized(false)
                                    setSafariInputFocused(false)
                                    setWindowOrder(o => o.filter(k => k !== "safari"))
                                    return currentTabs
                                  }
                                  const nextTabs = currentTabs.filter(currentTab => currentTab.id !== tab.id)
                                  if (tab.id === activeSafariTabId) {
                                    const nextActiveTab = nextTabs[Math.max(0, currentTabs.findIndex(currentTab => currentTab.id === tab.id) - 1)] ?? nextTabs[0]
                                    if (nextActiveTab) {
                                      setActiveSafariTabId(nextActiveTab.id)
                                      setSafariInputFocused(false)
                                    }
                                  }
                                  return nextTabs
                                })
                              }}
                            >
                              <svg width={Math.round(tabH * 0.24)} height={Math.round(tabH * 0.24)} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                      <div
                        onClick={e => {
                          e.stopPropagation()
                          const nextTabId = ++safariTabIdRef.current
                          setSafariTabs(currentTabs => [...currentTabs, { id: nextTabId, url: "", history: [""], historyIndex: 0 }])
                          setActiveSafariTabId(nextTabId)
                          setSafariInputFocused(false)
                        }}
                        style={{ width: Math.round(tabH * 0.88), height: Math.round(tabH * 0.88), display: "flex", alignItems: "center", justifyContent: "center", color: textSec as string, cursor: "pointer", fontSize: fs(0.02), fontWeight: 600, borderRadius: 0, background: "transparent", border: "none", flexShrink: 0 }}
                      >
                        +
                      </div>
                    </div>

                    {/* Content area */}
                    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: isDark ? "#111215" : "#f8fafc" }}>
                      {safariTabs.map(tab => {
                        const tabUrl = tab.url
                        const tabHost = tabUrl
                          ? (() => { try { return new URL(tabUrl.startsWith("http") ? tabUrl : "https://" + tabUrl).hostname } catch { return tabUrl } })()
                          : ""
                        const tabPath = tabUrl
                          ? (() => { try { return new URL(tabUrl.startsWith("http") ? tabUrl : "https://" + tabUrl).pathname } catch { return "/" } })()
                          : "/"
                        const tabIsGithubUrl = tabHost.includes("github.com")
                        const tabGithubPathParts = tabPath.split("/").filter(Boolean)
                        const tabGithubOwner = tabGithubPathParts[0] ?? "github"
                        const tabGithubRepo = tabGithubPathParts[1] ?? ""
                        const isActiveTab = tab.id === activeSafariTabId

                        return (
                          <div
                            key={tab.id}
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: isActiveTab ? "block" : "none",
                            }}
                          >
                            {tabUrl ? (
                              tabIsGithubUrl ? (
                                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: Math.round(sh2 * 0.026), background: isDark ? "linear-gradient(180deg,#0f1115 0%, #111827 100%)" : "linear-gradient(180deg,#f8fafc 0%, #eef2ff 100%)", padding: Math.round(sw2 * 0.05) }}>
                                  <div style={{ width: Math.round(sw2 * 0.1), height: Math.round(sw2 * 0.1), borderRadius: Math.round(sw2 * 0.028), background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", border: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: textPrimary as string, fontSize: fs(0.038), fontWeight: 800, fontFamily: ff, boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.35)" : "0 18px 42px rgba(15,23,42,0.08)" }}>
                                    GH
                                  </div>
                                  <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: Math.round(sh2 * 0.01), maxWidth: Math.round(sw2 * 0.6) }}>
                                    <div style={{ fontSize: fs(0.03), fontWeight: 700, color: textPrimary as string, fontFamily: ff }}>
                                      {tabGithubRepo ? `${tabGithubOwner}/${tabGithubRepo}` : "GitHub"}
                                    </div>
                                    <div style={{ fontSize: fs(0.015), lineHeight: 1.6, color: textSec as string, fontFamily: ff }}>
                                      GitHub blocks embedded page previews, so this Safari mock shows a native fallback card instead of an iframe.
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: Math.round(sw2 * 0.014) }}>
                                    <div onClick={() => window.open(tabUrl, "_blank", "noopener,noreferrer")} style={{ padding: `${Math.round(sh2 * 0.012)}px ${Math.round(sw2 * 0.02)}px`, borderRadius: 999, background: "#0a84ff", color: "#fff", fontSize: fs(0.014), fontWeight: 700, fontFamily: ff, cursor: "pointer", boxShadow: "0 12px 24px rgba(10,132,255,0.24)" }}>
                                      Open GitHub
                                    </div>
                                    <div style={{ padding: `${Math.round(sh2 * 0.012)}px ${Math.round(sw2 * 0.02)}px`, borderRadius: 999, background: panelBg, color: textSec as string, fontSize: fs(0.014), fontWeight: 600, fontFamily: ff, border: `0.5px solid ${divClr}` }}>
                                      github.com
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <iframe
                                  src={tabUrl}
                                  style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#fff" }}
                                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                  title={`Safari Tab ${tab.id}`}
                                />
                              )
                            ) : (
                              <div
                                onClick={() => setSafariSettingsPanelOpen(false)}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative",
                                  overflow: "auto",
                                  background: isDark ? "#111215" : "#f8fafc",
                                }}
                              >
                                <img
                                  src={safariWallpaper}
                                  alt="Safari wallpaper"
                                  draggable={false}
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: isDark
                                      ? "linear-gradient(180deg, rgba(8,10,14,0.26), rgba(8,10,14,0.58))"
                                      : "transparent",
                                  }}
                                />
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: "absolute",
                                    top: Math.round(sh2 * 0.18),
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    width: Math.min(Math.round(sw2 * 0.62), 640),
                                    padding: `${Math.round(sh2 * 0.008)}px ${Math.round(sw2 * 0.015)}px ${Math.round(sh2 * 0.009)}px`,
                                    borderRadius: 0,
                                    background: isDark ? "rgba(255,255,255,0.08)" : "transparent",
                                    backdropFilter: isDark ? "blur(14px)" : "none",
                                    WebkitBackdropFilter: isDark ? "blur(14px)" : "none",
                                    boxShadow: isDark
                                      ? "0 18px 38px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
                                      : "none",
                                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "transparent"}`,
                                    zIndex: 1,
                                  }}
                                >
                                  <div style={{ fontSize: fs(0.0145), fontWeight: 600, color: isDark ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.96)", textAlign: "center", fontFamily: ff, marginBottom: Math.round(sh2 * 0.006), textShadow: "0 1px 8px rgba(0,0,0,0.16)" }}>
                                    Favorites
                                  </div>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                                      gap: Math.round(sw2 * 0.009),
                                      justifyItems: "center",
                                    }}
                                  >
                                    {SAFARI_FAVORITES.map((item, index) => {
                                      const iconSize = Math.round(sw2 * 0.05)
                                      const isHovered = hoveredSafariFavorite === index
                                      const isPressed = pressedSafariFavorite === index
                                      return (
                                        <button
                                          key={item.label}
                                          type="button"
                                          onMouseEnter={() => setHoveredSafariFavorite(index)}
                                          onMouseLeave={() => {
                                            setHoveredSafariFavorite(null)
                                            setPressedSafariFavorite(null)
                                          }}
                                          onMouseDown={() => setPressedSafariFavorite(index)}
                                          onMouseUp={() => setPressedSafariFavorite(null)}
                                          onClick={() => {
                                            setActiveSafariTabId(tab.id)
                                            setSafariInput(item.url)
                                            setSafariInputFocused(false)
                                            navigate(item.url)
                                          }}
                                          style={{
                                            border: "none",
                                            background: "transparent",
                                            padding: 0,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: Math.round(sh2 * 0.0035),
                                            cursor: "pointer",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: iconSize,
                                              height: iconSize,
                                              borderRadius: 11,
                                              overflow: "hidden",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              background: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)",
                                              boxShadow: isPressed
                                                ? "0 6px 16px rgba(0,0,0,0.16)"
                                                : isHovered
                                                  ? "0 14px 28px rgba(15,23,42,0.18), 0 0 14px rgba(255,255,255,0.14)"
                                                  : "0 8px 18px rgba(15,23,42,0.14)",
                                              transform: isPressed ? "scale(0.97)" : isHovered ? "scale(1.05)" : "scale(1)",
                                              transition: "transform 0.16s ease, box-shadow 0.16s ease",
                                            }}
                                          >
                                            <img
                                              src={`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(item.url)}`}
                                              alt={item.label}
                                              draggable={false}
                                              style={{ width: Math.round(iconSize * 0.68), height: Math.round(iconSize * 0.68), display: "block" }}
                                            />
                                          </div>
                                          <span
                                            style={{
                                              fontSize: fs(0.0104),
                                              fontWeight: 500,
                                              color: isDark ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.94)",
                                              fontFamily: ff,
                                              textAlign: "center",
                                              whiteSpace: "nowrap",
                                              textShadow: "0 1px 6px rgba(0,0,0,0.18)",
                                            }}
                                          >
                                            {item.label}
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                                {!safariSettingsPanelOpen && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSafariSettingsPanelOpen(true)
                                    }}
                                    style={{
                                      position: "absolute",
                                      bottom: Math.round(sh2 * 0.035),
                                      right: Math.round(sw2 * 0.03),
                                      zIndex: 2,
                                      color: isDark ? textPrimary as string : "#ffffff",
                                      width: Math.round(sw2 * 0.04),
                                      height: Math.round(sw2 * 0.04),
                                      minWidth: 24,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "transparent",
                                      border: "none",
                                      padding: 0,
                                    }}
                                  >
                                    <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                      <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                )}
                                {safariSettingsPanelOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: "absolute",
                                      right: Math.round(sw2 * 0.03),
                                      bottom: Math.round(sh2 * 0.035),
                                      width: Math.round(sw2 * 0.32),
                                      minWidth: 260,
                                      maxWidth: Math.round(sw2 * 0.4),
                                      padding: `${Math.round(sh2 * 0.013)}px ${Math.round(sw2 * 0.014)}px`,
                                      borderRadius: 9,
                                      background: isDark ? glassBg : "rgba(255,255,255,0.22)",
                                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.3)"}`,
                                      boxShadow: isDark
                                        ? "0 14px 34px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.06)"
                                        : "0 14px 34px rgba(96,120,148,0.16), inset 0 1px 0 rgba(255,255,255,0.52)",
                                      backdropFilter: "blur(18px) saturate(1.15)",
                                      WebkitBackdropFilter: "blur(18px) saturate(1.15)",
                                      overflow: "hidden",
                                      zIndex: 2,
                                    }}
                                  >
                                    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: Math.round(sh2 * 0.012) }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <span style={{ fontSize: fs(0.015), fontWeight: 700, color: textPrimary as string, fontFamily: ff, letterSpacing: -0.2 }}>
                                          Background Image
                                        </span>
                                        <span style={{ fontSize: fs(0.0115), color: textSec as string, fontFamily: ff }}>
                                          Pick a wallpaper for the Safari start page
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: Math.round(sw2 * 0.012) }}>
                                        {SAFARI_WALLPAPERS.slice(0, 3).map((wallpaperSrc, index) => {
                                          const isActiveWallpaper = safariWallpaper === wallpaperSrc
                                          return (
                                            <button
                                              key={wallpaperSrc}
                                              type="button"
                                              onClick={() => setSafariWallpaper(wallpaperSrc)}
                                              style={{
                                                width: Math.round(sw2 * 0.092),
                                                height: Math.round(sh2 * 0.084),
                                                borderRadius: 9,
                                                border: `1px solid ${isActiveWallpaper ? "rgba(64,156,255,0.95)" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.22)")}`,
                                                padding: 0,
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                position: "relative",
                                                flexShrink: 0,
                                                boxShadow: isActiveWallpaper ? "0 0 0 1px rgba(79,154,255,0.24), 0 0 18px rgba(64,156,255,0.32)" : "none",
                                              }}
                                            >
                                              <img
                                                src={wallpaperSrc}
                                                alt={`Wallpaper ${index + 1}`}
                                                draggable={false}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                              />
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {!safariMaximized && (
                      <ResizeHandle
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const startX = e.clientX
                          const startY = e.clientY
                          const startW = sw2
                          const startH = sh2
                          const winLeft = baseLeft + safariPos.x
                          const winTop = baseTop + safariPos.y
                          const minW = Math.round(w * 0.58)
                          const minH = Math.round(h * 0.44)
                          const maxW = Math.max(minW, (w - 20) - winLeft)
                          const maxH = Math.max(minH, h - winTop)
                          const onMove = (ev: MouseEvent) => {
                            setSafariSize({
                              w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                              h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                            })
                          }
                          const onUp = () => {
                            window.removeEventListener("mousemove", onMove)
                            window.removeEventListener("mouseup", onUp)
                          }
                          window.addEventListener("mousemove", onMove)
                          window.addEventListener("mouseup", onUp)
                        }}
                      />
                    )}
                  </div>
                )
              })()}

              {/* Finder overlay */}
              {finderOpen && !finderMinimized && (() => {
                const fw = finderSize.w || Math.round(w * 0.94)
                const fh = finderSize.h || Math.round(h * 0.82)
                const sideW = Math.round(fw * 0.28)
                const fs = Math.round(w * 0.021)
                const mbH = Math.round(h * 0.036)
                const titleH = Math.round(fh * 0.075)
                const tlSz = Math.round(titleH * 0.38)
                const tlGap = Math.round(titleH * 0.2)
                const tlLeft = Math.round(titleH * 0.3)
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
                const featureFiles = (features ?? []).map((f, i) => ({ name: f.slice(0, 22) + (f.length > 22 ? "..." : ""), type: "file", id: `feat-${i}` }))
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
                    onClick={(e) => { e.stopPropagation(); bringToFront("finder"); setFocusedWinId(null) }}
                    style={{
                      position: "absolute",
                      ...(finderMaximized
                        ? { top: mbH, left: 0, right: 0, bottom: 0 }
                        : {
                            width: fw,
                            height: fh,
                            left: Math.round((w - 20 - fw) / 2) + finderPos.x,
                            top: mbH + Math.round((h - mbH - fh) * 0.08) + finderPos.y,
                          }),
                      zIndex: 3 + (windowOrder.indexOf("finder") >= 0 ? windowOrder.indexOf("finder") : 0),
                      borderRadius: finderMaximized ? 0 : 10,
                      borderTopLeftRadius: finderMaximized ? 12 : 10,
                      borderTopRightRadius: finderMaximized ? 12 : 10,
                      overflow: "hidden",
                      display: "flex", flexDirection: "column",
                      boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.1)",
                      animation: finderMinimizing
                        ? "mbMinimize 0.36s cubic-bezier(0.4,0,0.6,1) forwards"
                        : "winIn 0.32s cubic-bezier(0.22,1,0.36,1)",
                      transition: finderDragRef.current ? "none" : "width 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1), top 0.3s cubic-bezier(0.32,0.72,0,1), left 0.3s cubic-bezier(0.32,0.72,0,1), border-radius 0.28s",
                      fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
                    }}>
                      {/* Title bar */}
                      <div style={{
                        height: titleH, background: titleBg,
                        borderBottom: `0.5px solid ${borderCol}`,
                        display: "flex", alignItems: "center",
                        padding: `0 ${Math.round(fw * 0.018)}px`,
                        gap: Math.round(fw * 0.008), flexShrink: 0, position: "relative",
                        cursor: finderMaximized ? "default" : "grab",
                      }}
                      onMouseDown={e => {
                        if (finderMaximized) return
                        e.preventDefault()
                        finderDragRef.current = { startX: e.clientX, startY: e.clientY, ox: finderPos.x, oy: finderPos.y }
                        const onMove = (ev: MouseEvent) => {
                          const drag = finderDragRef.current
                          if (!drag) return
                          setFinderPos({ x: drag.ox + ev.clientX - drag.startX, y: drag.oy + ev.clientY - drag.startY })
                        }
                        const onUp = (ev: MouseEvent) => {
                          if (shouldSnapWindowToTop(ev.clientY)) {
                            setFinderPos(pos => ({ x: pos.x, y: Math.max(pos.y, 0) }))
                            setFinderMaximized(true)
                          }
                          finderDragRef.current = null
                          window.removeEventListener("mousemove", onMove)
                          window.removeEventListener("mouseup", onUp)
                        }
                        window.addEventListener("mousemove", onMove)
                        window.addEventListener("mouseup", onUp)
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: tlGap, paddingLeft: tlLeft, zIndex: 1 }}>
                          {[
                            { fill: "#ed6a5f", border: "#e24b41", kind: "close" as const, symClr: "#460804", fn: () => { setFinderOpen(false); setFinderMinimized(false); setFinderMaximized(false); setFinderPos({ x: 0, y: 0 }); setWindowOrder(o => o.filter(k => k !== "finder")) } },
                            { fill: "#f6be50", border: "#e1a73e", kind: "minimize" as const, symClr: "#90591d", fn: () => { setFinderMinimizing(true); setTimeout(() => { setFinderMinimized(true); setFinderMinimizing(false) }, 340) } },
                            { fill: "#61c555", border: "#2dac2f", kind: "maximize" as const, symClr: "#2a6218", fn: () => setFinderMaximized(v => !v) },
                          ].map((btn, i) => (
                            <div key={i}
                              onClick={(e) => { e.stopPropagation(); btn.fn() }}
                              onMouseEnter={() => setHoveredFinderTl(i)}
                              onMouseLeave={() => setHoveredFinderTl(-1)}
                              style={{
                                width: tlSz, height: tlSz, borderRadius: "50%", background: btn.fill, cursor: "pointer", flexShrink: 0,
                                border: `0.5px solid ${btn.border}`, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.18)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                              <TrafficLightSymbol kind={btn.kind} color={btn.symClr} size={Math.round(tlSz * 0.84)} visible={hoveredFinderTl === i} />
                            </div>
                          ))}
                        </div>
                        {/* Toolbar icons */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: Math.round(fw * 0.025) }}>
                          {/* Back/Forward */}
                          <div style={{ display: "flex", gap: 2 }}>
                            {["<", ">"].map((ch, i) => (
                              <div key={i} style={{ fontSize: Math.round(w * 0.032), color: textSec as string, cursor: "default", lineHeight: 1, paddingBottom: 1 }}>{ch}</div>
                            ))}
                          </div>
                          {/* Path breadcrumb */}
                          <div style={{ fontSize: Math.round(w * 0.019), color: textPri as string, fontWeight: 600, letterSpacing: -0.2 }}>
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
                      {!finderMaximized && (
                        <ResizeHandle
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            const startX = e.clientX
                            const startY = e.clientY
                            const startW = fw
                            const startH = fh
                            const winLeft = Math.round((w - 20 - fw) / 2) + finderPos.x
                            const winTop = mbH + Math.round((h - mbH - fh) * 0.08) + finderPos.y
                            const minW = Math.round(w * 0.58)
                            const minH = Math.round(h * 0.46)
                            const maxW = Math.max(minW, (w - 20) - winLeft)
                            const maxH = Math.max(minH, h - winTop)
                            const onMove = (ev: MouseEvent) => {
                              setFinderSize({
                                w: Math.max(minW, Math.min(maxW, startW + ev.clientX - startX)),
                                h: Math.max(minH, Math.min(maxH, startH + ev.clientY - startY)),
                              })
                            }
                            const onUp = () => {
                              window.removeEventListener("mousemove", onMove)
                              window.removeEventListener("mouseup", onUp)
                            }
                            window.addEventListener("mousemove", onMove)
                            window.addEventListener("mouseup", onUp)
                          }}
                        />
                      )}
                    </div>
                )
              })()}

              {/* Dock - show when multiple images OR description OR github exists */}
              {(hasDock || showTerminalIcon || showGithubIcon) && (
                <div
                  onMouseLeave={() => {
                    if (dockSleeping) {
                      setDockPeek(false)
                      setHoveredSlot(null)
                      resetTargets()
                    }
                  }}
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
                    pointerEvents: "none",
                  }}
                >
                  {dockSleeping && !dockPeek && (
                    <div
                      onMouseEnter={() => {
                        setDockPeek(true)
                      }}
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 1,
                        transform: "translateX(-50%)",
                        width: Math.round(ICON_BASE * 2.1),
                        height: Math.round(ICON_BASE * 0.22),
                        borderRadius: 999,
                        background: isDark
                          ? "linear-gradient(180deg, rgba(56,56,61,0.82) 0%, rgba(18,18,21,0.94) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.24) 100%)",
                        border: isDark ? "0.5px solid rgba(255,255,255,0.12)" : "0.5px solid rgba(255,255,255,0.48)",
                        boxShadow: isDark
                          ? "0 10px 24px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08)"
                          : "0 8px 22px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.65)",
                        backdropFilter: "blur(20px) saturate(1.35)",
                        WebkitBackdropFilter: "blur(20px) saturate(1.35)",
                        pointerEvents: "auto",
                        transition: "transform 0.18s ease, opacity 0.18s ease",
                      }}
                    >
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        top: 1,
                        transform: "translateX(-50%)",
                        width: "76%",
                        height: "34%",
                        borderRadius: 999,
                        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.38)",
                        filter: "blur(0.5px)",
                      }} />
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "52%",
                        height: "130%",
                        borderRadius: 999,
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.2)",
                        filter: "blur(10px)",
                        opacity: 0.75,
                      }} />
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "28%",
                        height: 1.5,
                        borderRadius: 999,
                        background: isDark ? "rgba(255,255,255,0.2)" : "rgba(71,85,105,0.12)",
                      }} />
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        bottom: -5,
                        transform: "translateX(-50%)",
                        width: "54%",
                        height: 9,
                        borderRadius: 999,
                        background: isDark ? "rgba(0,0,0,0.28)" : "rgba(148,163,184,0.12)",
                        filter: "blur(10px)",
                        opacity: 0.85,
                      }} />
                    </div>
                  )}
                  <div
                    onMouseEnter={() => {
                      if (dockSleeping) setDockPeek(true)
                    }}
                    onMouseLeave={() => {
                      resetTargets()
                    }}
                    ref={dockRef}
                    data-dock
                    onMouseMove={(e) => { computeTargets(e.clientX) }}
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
                      pointerEvents: hovered && (!dockSleeping || dockPeek) ? "auto" : "none",
                      opacity: dockSleeping && !dockPeek ? 0 : 1,
                      transform: dockSleeping && !dockPeek ? "translateY(18px) scale(0.96)" : "translateY(0) scale(1)",
                      transition: "opacity 0.22s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* App icon - always first */}
                    <div
                      ref={(el) => { iconRefs.current[0] = el }}
                      onMouseEnter={() => setHoveredSlot("app")}
                      onMouseLeave={() => setHoveredSlot(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        const isOnTop = windowOrder[windowOrder.length - 1] === "finder"
                        if (!finderOpen || finderMinimized) {
                          triggerDockBounce("finder")
                          setFinderOpen(true)
                          setFinderMinimized(false)
                          setFinderMinimizing(false)
                          setWindowOrder(o => [...o.filter(k => k !== "finder"), "finder"])
                        } else if (isOnTop) {
                          setFinderMinimizing(true)
                          setTimeout(() => { setFinderMinimized(true); setFinderMinimizing(false) }, 340)
                        } else {
                          setWindowOrder(o => [...o.filter(k => k !== "finder"), "finder"])
                        }
                      }}
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
                        background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)",
                        backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)",
                        borderRadius: 7, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                        fontSize: Math.round(w * 0.016), fontWeight: 400,
                        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                        color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                        pointerEvents: "none", zIndex: 100,
                        opacity: hoveredSlot === "app" ? 1 : 0,
                        transition: "opacity 0.12s ease",
                        border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)",
                        boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)",
                      }}>Finder</div>
                      <img
                        src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429910/128_vv8kbl.png"
                        alt="Finder"
                        draggable={false}
                        style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scales[0] ?? 1})`, transformOrigin: "bottom center", willChange: "transform", animation: (finderMinimized || dockBounceKeys.finder) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined }}
                      />
                      <div style={{
                        position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%",
                        transform: "translateX(-50%)", width: 2.5, height: 2.5,
                        borderRadius: "50%",
                        background: finderOpen && !finderMinimized ? "rgba(255,255,255,0.9)" : "transparent",
                        transition: "background 0.2s", pointerEvents: "none",
                      }} />
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
                      const isMinimized = openWindows.some(w => w.projectIdx === idx && w.minimized)
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
                              const shouldBounce = !existing || existing.minimized
                              if (shouldBounce) triggerDockBounce(`project-${idx}`)
                              openWindow(idx)
                            }
                          }}
                        >
                          {/* label */}
                          <div style={{
                            position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`,
                            left: "50%", transform: "translateX(-50%)",
                            background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)",
                            backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)",
                            borderRadius: 7, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                            fontSize: Math.round(w * 0.016), fontWeight: 400,
                            fontFamily: "'SF Pro','SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
                            color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                            pointerEvents: "none", zIndex: 100,
                            opacity: hoveredSlot === slotKey ? 1 : 0,
                            transition: "opacity 0.12s ease",
                            border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)",
                            boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)",
                          }}>{p.title ?? `Project ${idx + 1}`}</div>
                          {thumb
                            ? <img src={thumb} alt={p.title ?? `project ${idx + 1}`} draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform", animation: (isMinimized || dockBounceKeys[`project-${idx}`]) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined }} />
                            : <div style={{ width: slotSize, height: slotSize, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform", borderRadius: Math.round(slotSize * 0.22), flexShrink: 0, background: ["linear-gradient(135deg,#1A88FE,#0055D4)","linear-gradient(135deg,#34C759,#248A3D)","linear-gradient(135deg,#FF3B30,#C0001A)","linear-gradient(135deg,#FF9500,#C65900)","linear-gradient(135deg,#AF52DE,#7026B9)","linear-gradient(135deg,#5856D6,#3634A3)","linear-gradient(135deg,#32ADE6,#007AFF)","linear-gradient(135deg,#FF2D55,#D60034)"][idx % 8], animation: (isMinimized || dockBounceKeys[`project-${idx}`]) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined }} />
                          }
                          <div style={{
                            position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%",
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
                            position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%",
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
                            triggerDockBounce("terminal")
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
                          background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)",
                          backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)",
                          borderRadius: 7, padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                          fontSize: Math.round(w * 0.016), fontWeight: 400,
                          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                          color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 100,
                          opacity: hoveredSlot === "terminal" ? 1 : 0,
                          transition: "opacity 0.12s ease",
                          border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)",
                          boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)",
                          display: "flex", alignItems: "center",
                        }}>
                          Terminal
                          <span>
                            {["ctrl", "↵"].map((key) => (
                              <span
                                key={key}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: key === "↵" ? Math.round(w * 0.016) : Math.round(w * 0.03),
                                  height: Math.round(w * 0.02),
                                  
                                  color: "rgba(255,255,255,0.7)",
                                  fontSize: Math.round(w * 0.0115),
                                  fontWeight: 500,
                                  lineHeight: 1,
                                }}
                              >
                                {key}
                              </span>
                            ))}
                          </span>
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
                            animation: (termMinimized || dockBounceKeys.terminal) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined,
                          }}
                        />
                        <div style={{
                          position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%",
                          transform: "translateX(-50%)", width: 2.5, height: 2.5,
                          borderRadius: "50%",
                          background: terminalOpen ? "rgba(255,255,255,0.9)" : "transparent",
                          transition: "background 0.2s", pointerEvents: "none",
                        }} />
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
                          background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)",
                          backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)",
                          borderRadius: 7, border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)", padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`,
                          fontSize: Math.round(w * 0.016), fontWeight: 400,
                          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
                          color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                          pointerEvents: "none", zIndex: 100,
                          opacity: hoveredSlot === "github" ? 1 : 0,
                          transition: "opacity 0.12s ease",
                          boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)",
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
                          onClick={e => {
                            e.stopPropagation()
                            if (vscodeAudioRef.current) {
                              vscodeAudioRef.current.pause()
                              vscodeAudioRef.current.currentTime = 0
                              vscodeAudioRef.current.play().catch(() => {})
                            }
                          }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)", backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)", borderRadius: 7, border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)", padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "vscode" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)" }}>Visual Studio Code</div>
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
                          onClick={e => {
                            e.stopPropagation()
                            const isOnTop = windowOrder[windowOrder.length - 1] === "messages"
                            if (!messagesOpen || messagesMinimized) {
                              triggerDockBounce("messages")
                              setMessagesMinimized(false); setMessagesMinimizing(false); setMessagesOpen(true)
                              setWindowOrder(o => [...o.filter(k => k !== "messages"), "messages"])
                            } else if (isOnTop) {
                              setMessagesMinimizing(true)
                              setTimeout(() => { setMessagesMinimized(true); setMessagesMinimizing(false) }, 340)
                            } else {
                              setWindowOrder(o => [...o.filter(k => k !== "messages"), "messages"])
                            }
                          }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)", backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)", borderRadius: 7, border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)", padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "messages" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)" }}>Messages</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429715/128_cdh305.webp" alt="Messages" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform", animation: (messagesMinimized || dockBounceKeys.messages) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined }} />
                          <div style={{ position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%", transform: "translateX(-50%)", width: 2.5, height: 2.5, borderRadius: "50%", background: messagesOpen ? "rgba(255,255,255,0.9)" : "transparent", transition: "background 0.2s", pointerEvents: "none" }} />
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
                              triggerDockBounce("safari")
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
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)", backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)", borderRadius: 7, border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)", padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "safari" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)" }}>Safari</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775423763/128_g9zehk.webp" alt="Safari" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform", animation: (safariMinimized || dockBounceKeys.safari) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined }} />
                          <div style={{ position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%", transform: "translateX(-50%)", width: 2.5, height: 2.5, borderRadius: "50%", background: safariOpen ? "rgba(255,255,255,0.9)" : "transparent", transition: "background 0.2s", pointerEvents: "none" }} />
                        </div>
                      )
                    })()}

                    {/* iTunes icon */}
                    {(() => {
                      const itunesRefIdx = dockCount + 4 + (showTerminalIcon ? 1 : 0) + (showGithubIcon ? 1 : 0)
                      const scale = scales[itunesRefIdx] ?? 1
                      return (
                        <div
                          ref={(el) => { iconRefs.current[itunesRefIdx] = el }}
                          onMouseEnter={() => setHoveredSlot("itunes")}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{ width: slotSize, height: slotSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "visible", position: "relative" }}
                          onClick={e => {
                            e.stopPropagation()
                            if (itunesOpen && itunesMinimized) {
                              triggerDockBounce("itunes")
                              setItunesMinimized(false); bringToFront("itunes")
                            } else {
                              if (!itunesOpen) triggerDockBounce("itunes")
                              setItunesOpen(o => { if (!o) setWindowOrder(ord => [...ord.filter(k => k !== "itunes"), "itunes"]); else setWindowOrder(ord => ord.filter(k => k !== "itunes")); return !o })
                            }
                          }}
                        >
                          <div style={{ position: "absolute", bottom: `calc(100% + ${Math.round(slotSize * 0.3)}px)`, left: "50%", transform: "translateX(-50%)", background: isDark ? "rgba(30,30,32,0.72)" : "rgba(255,255,255,0.42)", backdropFilter: "blur(22px) saturate(1.45)", WebkitBackdropFilter: "blur(22px) saturate(1.45)", borderRadius: 7, border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(255,255,255,0.52)", padding: `${Math.round(w * 0.004)}px ${Math.round(w * 0.011)}px`, fontSize: Math.round(w * 0.016), fontWeight: 400, fontFamily: "-apple-system,sans-serif", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100, opacity: hoveredSlot === "itunes" ? 1 : 0, transition: "opacity 0.12s ease", boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.34)" : "0 6px 18px rgba(15,23,42,0.08)" }}>iTunes</div>
                          <img src="https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775429984/256_bumw1c.png" alt="iTunes" draggable={false} style={{ width: slotSize, height: slotSize, objectFit: "contain", display: "block", flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "bottom center", willChange: "transform", animation: (itunesMinimized || dockBounceKeys.itunes) ? "mbDockBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 2" : undefined }} />
                          <div style={{ position: "absolute", bottom: -(DOCK_PAD_Y - 3), left: "50%", transform: "translateX(-50%)", width: 2.5, height: 2.5, borderRadius: "50%", background: itunesOpen ? "rgba(255,255,255,0.9)" : "transparent", transition: "background 0.2s", pointerEvents: "none" }} />
                        </div>
                      )
                    })()}
                  </div>

                </div>
              )}

              {/* Context Menu */}
              {contextMenu && (
                (() => {
                  const targetItem = contextMenu.targetId !== null
                    ? desktopItems.find(item => item.id === contextMenu.targetId) ?? null
                    : null
                  const menuItems = targetItem
                    ? (targetItem.type === "folder"
                        ? [
                            ...(!targetItem.locked ? [{ label: "Rename", action: () => { setEditingDesktopItemId(targetItem.id); setEditingDesktopName(targetItem.name) } }] : []),
                            { label: "Open in Terminal", action: () => openDesktopFolderInTerminal(targetItem) },
                            ...(!targetItem.locked ? [null, { label: "Delete Folder", action: () => deleteDesktopItem(targetItem) }] : []),
                          ]
                        : [
                            { label: "Rename", action: () => { setEditingDesktopItemId(targetItem.id); setEditingDesktopName(targetItem.name) } },
                            { label: "Edit", action: () => openDesktopItem(targetItem) },
                            null,
                            { label: "Delete File", action: () => deleteDesktopItem(targetItem) },
                          ])
                    : [
                        { label: "New Folder", action: () => createDesktopEntry("folder") },
                        { label: "New File", action: () => createDesktopEntry("file") },
                        null,
                        { label: "Open Terminal", action: openTerminalWindow },
                        null,
                        { label: "Refresh Desktop", action: () => setDesktopItems(prev => [...prev]) },
                      ]
                  const menuW = Math.round(w * 0.245)
                  const clampedX = Math.min(contextMenu.x, Math.max(12, w - 20 - menuW - 12))
                  const clampedY = Math.min(contextMenu.y, Math.max(12, h - Math.round(h * 0.26)))
                  const rowPadY = Math.round(h * 0.008)
                  const rowPadX = Math.round(w * 0.013)
                  return (
                    <div
                      style={{
                        position: "absolute",
                        left: clampedX,
                        top: clampedY,
                        zIndex: 1000,
                      }}
                      onContextMenu={e => e.preventDefault()}
                      onClick={e => e.stopPropagation()}
                    >
                      <div
                        style={{
                          background: isDark
                            ? "linear-gradient(180deg, rgba(62,62,68,0.72) 0%, rgba(34,34,38,0.8) 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(244,247,251,0.88) 100%)",
                          backdropFilter: "blur(30px) saturate(1.5)",
                          WebkitBackdropFilter: "blur(30px) saturate(1.5)",
                          borderRadius: 6,
                          border: `0.5px solid ${isDark ? "rgba(255,255,255,0.16)" : "rgba(148,163,184,0.18)"}`,
                          boxShadow: isDark
                            ? "0 24px 60px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.18)"
                            : "0 24px 60px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(148,163,184,0.12)",
                          minWidth: menuW,
                          overflow: "hidden",
                          fontFamily: "-apple-system,'SF Pro Text','SF Pro Display',BlinkMacSystemFont,sans-serif",
                          fontSize: Math.round(w * 0.0135),
                          lineHeight: 1.35,
                          animation: "menuFadeIn 0.14s ease-out",
                          padding: 5,
                        }}
                      >
                        {menuItems.map((item, idx) =>
                          item === null ? (
                            <div
                              key={`sep-${idx}`}
                              style={{
                                height: 1,
                                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
                                margin: `${Math.round(h * 0.004)}px ${Math.round(w * 0.008)}px`,
                              }}
                            />
                          ) : (
                            <div
                              key={idx}
                              onMouseEnter={() => setContextMenuHovered(idx)}
                              onMouseLeave={() => setContextMenuHovered(null)}
                              onClick={(e) => {
                                e.stopPropagation()
                                item.action()
                                setContextMenu(null)
                                setContextMenuHovered(null)
                              }}
                              style={{
                                padding: `${rowPadY}px ${rowPadX}px`,
                                color: contextMenuHovered === idx ? "#fff" : (isDark ? "rgba(255,255,255,0.94)" : "rgba(15,23,42,0.92)"),
                                background: contextMenuHovered === idx
                                  ? "linear-gradient(180deg, #0a84ff 0%, #007aff 100%)"
                                  : "transparent",
                                cursor: "pointer",
                                transition: "background 0.12s ease, color 0.12s ease",
                                userSelect: "none",
                                fontWeight: 500,
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: Math.round(w * 0.006),
                              }}
                            >
                              <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                })()
              )}
              {folderContextMenu && (
                (() => {
                  const menuItems = folderContextMenu.targetType === null
                    ? [
                        { label: "New Folder", action: () => createFolderWindowEntry(folderContextMenu.winId, folderContextMenu.path, "folder") },
                        { label: "New File", action: () => createFolderWindowEntry(folderContextMenu.winId, folderContextMenu.path, "file") },
                      ]
                    : folderContextMenu.targetType === "folder"
                      ? [
                          ...(folderContextMenu.mutable ? [{
                            label: "Rename",
                            action: () => startFolderRename(folderContextMenu.winId, folderContextMenu.path, folderContextMenu.targetName!, "folder"),
                          }] : []),
                          { label: "Open in Terminal", action: () => openFolderPathInTerminal(`${folderContextMenu.path}/${folderContextMenu.targetName}`) },
                          ...(folderContextMenu.mutable ? [null, {
                            label: "Delete Folder",
                            action: () => deleteFolderWindowEntry(folderContextMenu.path, folderContextMenu.targetName!, "folder"),
                          }] : []),
                        ]
                      : [
                          ...(folderContextMenu.mutable ? [{
                            label: "Rename",
                            action: () => startFolderRename(folderContextMenu.winId, folderContextMenu.path, folderContextMenu.targetName!, "file"),
                          }] : []),
                          {
                            label: "Edit",
                            action: () => openFileEditorAtPath(`${folderContextMenu.path}/${folderContextMenu.targetName}`, folderContextMenu.targetName!),
                          },
                          ...(folderContextMenu.mutable ? [null, {
                            label: "Delete File",
                            action: () => deleteFolderWindowEntry(folderContextMenu.path, folderContextMenu.targetName!, "file"),
                          }] : []),
                        ]
                  const menuW = Math.round(w * 0.245)
                  const clampedX = Math.min(folderContextMenu.x, Math.max(12, w - 20 - menuW - 12))
                  const clampedY = Math.min(folderContextMenu.y, Math.max(12, h - Math.round(h * 0.26)))
                  const rowPadY = Math.round(h * 0.008)
                  const rowPadX = Math.round(w * 0.013)
                  return (
                    <div
                      style={{
                        position: "absolute",
                        left: clampedX,
                        top: clampedY,
                        zIndex: 1001,
                      }}
                      onContextMenu={e => e.preventDefault()}
                      onClick={e => e.stopPropagation()}
                    >
                      <div
                        style={{
                          background: isDark
                            ? "linear-gradient(180deg, rgba(62,62,68,0.72) 0%, rgba(34,34,38,0.8) 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(244,247,251,0.88) 100%)",
                          backdropFilter: "blur(30px) saturate(1.5)",
                          WebkitBackdropFilter: "blur(30px) saturate(1.5)",
                          borderRadius: 6,
                          border: `0.5px solid ${isDark ? "rgba(255,255,255,0.16)" : "rgba(148,163,184,0.18)"}`,
                          boxShadow: isDark
                            ? "0 24px 60px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.18)"
                            : "0 24px 60px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(148,163,184,0.12)",
                          minWidth: menuW,
                          overflow: "hidden",
                          fontFamily: "-apple-system,'SF Pro Text','SF Pro Display',BlinkMacSystemFont,sans-serif",
                          fontSize: Math.round(w * 0.0135),
                          lineHeight: 1.35,
                          animation: "menuFadeIn 0.14s ease-out",
                          padding: 5,
                        }}
                      >
                        {menuItems.map((item, idx) =>
                          item === null ? (
                            <div
                              key={`folder-sep-${idx}`}
                              style={{
                                height: 1,
                                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
                                margin: `${Math.round(h * 0.004)}px ${Math.round(w * 0.008)}px`,
                              }}
                            />
                          ) : (
                            <div
                              key={idx}
                              onMouseEnter={() => setFolderContextMenuHovered(idx)}
                              onMouseLeave={() => setFolderContextMenuHovered(null)}
                              onClick={(e) => {
                                e.stopPropagation()
                                item.action()
                                setFolderContextMenu(null)
                                setFolderContextMenuHovered(null)
                              }}
                              style={{
                                padding: `${rowPadY}px ${rowPadX}px`,
                                color: folderContextMenuHovered === idx ? "#fff" : (isDark ? "rgba(255,255,255,0.94)" : "rgba(15,23,42,0.92)"),
                                background: folderContextMenuHovered === idx
                                  ? "linear-gradient(180deg, #0a84ff 0%, #007aff 100%)"
                                  : "transparent",
                                cursor: "pointer",
                                transition: "background 0.12s ease, color 0.12s ease",
                                userSelect: "none",
                                fontWeight: 500,
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                })()
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
        [data-mac-root],
        [data-mac-root] * {
          cursor: url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424556/normal-select_ihp9on.svg") 1 1, default !important;
        }
        [data-mac-root] [style*="cursor: pointer"],
        [data-mac-root] *[style*="cursor:pointer"] {
          cursor: url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424556/normal-select_ihp9on.svg") 1 1, pointer !important;
        }
        [data-dock], [data-dock] * {
          cursor: url("https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775424556/normal-select_ihp9on.svg") 1 1, default !important;
        }
        @keyframes mbFade {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes menuFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
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
