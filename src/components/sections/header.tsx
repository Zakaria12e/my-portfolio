"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ModeToggle } from "@/components/effects/mode-toggle"
import { X, Menu } from "lucide-react"

const NAV_ITEMS = [
  { name: "Home",    href: "#home"    },
  { name: "Work",    href: "#work"    },
  { name: "About",   href: "#about"   },
  { name: "Contact", href: "#contact" },
]

export function ModernHeader() {
  const [scrolled,   setScrolled]   = useState(false)
  const [active,     setActive]     = useState("Home")
  const [menuOpen,   setMenuOpen]   = useState(false)

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    NAV_ITEMS.forEach(({ name, href }) => {
      const el = document.querySelector(href)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(name) },
        { rootMargin: "-40% 0px -55% 0px" }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const handleNav = (href: string, name: string) => {
    setActive(name)
    setMenuOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          layout
          animate={scrolled ? {
            marginTop: 12,
            paddingLeft: 20,
            paddingRight: 20,
            borderRadius: 999,
          } : {
            marginTop: 0,
            paddingLeft: 0,
            paddingRight: 0,
            borderRadius: 0,
          }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className={`w-full max-w-5xl transition-shadow ${
            scrolled
              ? "bg-background/80 backdrop-blur-xl border border-border/50 shadow-[0_4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
              : "bg-transparent"
          }`}
        >
          <div className="flex items-center justify-between px-6 py-3">

            {/* Logo */}
            <motion.a
              href="#home"
              onClick={e => { e.preventDefault(); handleNav("#home", "Home") }}
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex-shrink-0"
            >
              <img src="/moon-purple.png" alt="logo" className="w-8 h-8 hidden dark:block drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
              <img src="/moon-dark.png"   alt="logo" className="w-8 h-8 block dark:hidden" />
            </motion.a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ name, href }) => {
                const isActive = active === name
                return (
                  <a
                    key={name}
                    href={href}
                    onClick={e => { e.preventDefault(); handleNav(href, name) }}
                    className="relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full"
                    style={{ color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-foreground/8 dark:bg-foreground/10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{name}</span>
                  </a>
                )
              })}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-3">
              <ModeToggle />
              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-foreground/8 transition-colors"
                aria-label="Toggle menu"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {menuOpen
                    ? <motion.span key="x"   initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}><X size={18} /></motion.span>
                    : <motion.span key="men" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate:-90, opacity: 0 }} transition={{ duration: 0.18 }}><Menu size={18} /></motion.span>
                  }
                </AnimatePresence>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-[68px] left-4 right-4 z-40 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            <nav className="flex flex-col p-3 gap-1">
              {NAV_ITEMS.map(({ name, href }, i) => (
                <motion.a
                  key={name}
                  href={href}
                  onClick={e => { e.preventDefault(); handleNav(href, name) }}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    active === name
                      ? "bg-foreground/8 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {name}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
