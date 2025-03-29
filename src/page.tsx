"use client"

import { useEffect } from "react" 
import { ModernHeader } from "@/components/sections/header"
import { ModernHero } from "@/components/sections/hero"
import { ModernWork } from "@/components/sections/work"
import { ModernAbout } from "@/components/sections/about"
import { ModernContact } from "@/components/sections/contact"
import { ModernFooter } from "@/components/sections/footer"
import { MouseTrail } from "@/components/effects/mouse-trail"

export default function Home() {
  useEffect(() => {
    const handleAnchorClick = (e: any) => {
      const target = e.target
      if (target.tagName === "A" && target.getAttribute("href")?.startsWith("#")) {
        e.preventDefault()
        const id = target.getAttribute("href")?.substring(1)
        const element = document.getElementById(id)
        if (element) {
          window.scrollTo({
            top: element.offsetTop - 80,
            behavior: "smooth",
          })
        }
      }
    }

    document.addEventListener("click", handleAnchorClick)
    return () => document.removeEventListener("click", handleAnchorClick)
  }, [])

  return (
    <div className="min-h-screen relative">
      <ModernHeader />
      <main>
        <ModernHero />
        <ModernWork />
        <ModernAbout />
        <ModernContact />
      </main>
      <ModernFooter />
      <MouseTrail />
    </div>
  )
}

