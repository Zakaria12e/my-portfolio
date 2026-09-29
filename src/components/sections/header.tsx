"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Home, Briefcase, User, Mail } from "lucide-react"
import { ModeToggle } from "@/components/effects/mode-toggle"

function smoothScroll(href: string, duration = 780) {
  const el = document.querySelector(href)
  if (!el) return
  const target = el.getBoundingClientRect().top + window.scrollY
  const start = window.scrollY
  const diff = target - start
  let startTime: number | null = null

  // Apple's deceleration curve
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  const step = (now: number) => {
    if (!startTime) startTime = now
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    window.scrollTo(0, start + diff * ease(progress))
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

const NAV_ITEMS = [
  { name: "Home",    href: "#home",    icon: Home      },
  { name: "Work",    href: "#work",    icon: Briefcase },
  { name: "About",   href: "#about",   icon: User      },
  { name: "Contact", href: "#contact", icon: Mail      },
]

export function ModernHeader() {
  const [active, setActive] = useState("Home")

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
    smoothScroll(href)
  }

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Tab bar */}
      <nav className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-[26px] bg-background/75 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-[0_4px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.45)]">
        {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
          const isActive = active === name
          return (
            <button
              key={name}
              onClick={() => handleNav(href, name)}
              aria-label={name}
              className="relative flex flex-col items-center justify-center w-[58px] h-11 rounded-[18px] group"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-[18px] bg-foreground/[0.08] dark:bg-foreground/[0.12]"
                  transition={{ type: "spring", stiffness: 380, damping: 42, mass: 0.8 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.08, y: -0.5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.7 }}
                className="relative z-10"
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.1 : 1.7}
                  className={`transition-colors duration-300 ${
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/60"
                  }`}
                />
              </motion.div>
              <span className={`relative z-10 text-[9px] font-semibold mt-0.5 leading-none transition-colors duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}>
                {name}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Toggle pill */}
      <div className="flex items-center justify-center w-11 h-11 rounded-full bg-background/75 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-[0_4px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.45)]">
        <ModeToggle />
      </div>
    </motion.div>
  )
}
