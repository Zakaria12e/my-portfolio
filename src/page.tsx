"use client"

import { useEffect } from "react"
import { ModernHeader } from "@/components/modern-header"
import { ModernHero } from "@/components/modern-hero"
import { ModernWork } from "@/components/modern-work"
import { ModernAbout } from "@/components/modern-about"
import { ModernContact } from "@/components/modern-contact"
import { ModernFooter } from "@/components/modern-footer"

export default function Home() {

  useEffect(() => {
    const handleAnchorClick = (e : any) => {
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
    <div className="min-h-screen bg-background">
      <ModernHeader />
      <main>
        <ModernHero />
        <ModernWork />
        <ModernAbout />
        <ModernContact />
        

      </main>
      <ModernFooter />
    </div>
  )
}

