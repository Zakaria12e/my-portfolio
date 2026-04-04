"use client"

import { useState, useEffect } from "react"
import MacbookPro from "@/components/effects/MacbookPro"

const projects = [
  {
    id: 1,
    title: "Real-Time Vehicle Tracking",
    description:
      "A real-time vehicle tracking platform offering seamless fleet monitoring, live GPS positioning, and smart alerting.",
    features: [
      "Live GPS tracking with Socket.io",
      "Fleet dashboard with real-time updates",
      "Smart alerts & geofencing",
      "Trip history & analytics",
      "Multi-user role management",
    ],
    images: [
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775240349/524_1x_shots_so_tdvn2k.png",
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775163711/31_1x_shots_so_ki7fmn.png",
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775240868/525_1x_shots_so_g2f4ya.png",
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775241142/389_1x_shots_so_tn7nvt.png",
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775241317/822_1x_shots_so_jsypks.png",
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775240361/186_1x_shots_so_ejpl0z.png"
    ],
    category: "Web",
    tags: ["React", "Node.js", "MongoDB", "Socket.io"],
    liveUrl: "https://trackvio.vercel.app",
    githubUrl: "https://github.com/Zakaria12e/vehicle-tracker-sys-frontend",
  },
  {
    id: 2,
    title: "Garamitos E-Commerce",
    description:
      "A full-stack e-commerce platform with a React storefront, REST API, JWT authentication, and MongoDB-powered product & order management.",
    features: [
      "Product catalog with search & filters",
      "JWT authentication & protected routes",
      "Shopping cart & checkout flow",
      "Order management dashboard",
      "Stripe payment integration",
    ],
    images: [
      "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775142859/326_1x_shots_so_fwewwe.png",
    ],
    category: "Web",
    tags: ["React", "Node.js", "Express", "MongoDB", "TailwindCSS"],
    liveUrl: "https://garamitos-ecom-demo.vercel.app",
    githubUrl: "https://github.com/Zakaria12e/Garamitos_Ecom",
  },
]

export function ModernWork() {
  const [macWidth, setMacWidth] = useState(680)

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setMacWidth(Math.min(window.innerWidth - 32, 340))
      else if (window.innerWidth < 1024) setMacWidth(Math.min(window.innerWidth - 64, 560))
      else setMacWidth(680)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return (
    <section id="work" className="py-24 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <div className="container flex justify-center">
        <MacbookPro projects={projects} width={macWidth} />
      </div>
    </section>
  )
}
