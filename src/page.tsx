"use client"

import { ModernHero } from "@/components/sections/hero"
import { ModernWork } from "@/components/sections/work"
import { ModernAbout } from "@/components/sections/about"
import { ModernContact } from "@/components/sections/contact"
import { ModernFooter } from "@/components/sections/footer"

export default function Home() {
  return (
    <div className="min-h-screen relative">
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

