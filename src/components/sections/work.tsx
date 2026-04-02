"use client"

import { useState, useEffect, type JSX } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Github, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import MacbookPro from "@/components/effects/MacbookPro"
import {
  SiReact,
  SiNodedotjs,
  SiMongodb,
  SiTailwindcss,
  SiGit,
  SiFigma,
  SiGooglemaps,
  SiSocketdotio,
  SiStripe,
  SiJavascript,
  SiTypescript,
  SiExpress,
  SiPython,
  SiMysql,
} from "react-icons/si"

const tagIcons: Record<string, JSX.Element> = {
  JavaScript:       <SiJavascript className="text-yellow-400" />,
  TypeScript:       <SiTypescript className="text-blue-500" />,
  React:            <SiReact className="text-cyan-400" />,
  "React Native":   <SiReact className="text-cyan-400" />,
  "Node.js":        <SiNodedotjs className="text-green-600" />,
  Express:          <SiExpress className="text-neutral-500" />,
  MongoDB:          <SiMongodb className="text-green-500" />,
  TailwindCSS:      <SiTailwindcss className="text-sky-400" />,
  Git:              <SiGit className="text-orange-500" />,
  framermotion:     <img src="/fm.svg" alt="Framer Motion" className="w-4 h-4" />,
  MySQL:            <SiMysql className="text-blue-700" />,
  Python:           <SiPython className="text-blue-600" />,
  Stripe:           <SiStripe className="text-indigo-500" />,
  "Google Maps API":<SiGooglemaps className="text-red-500" />,
  "Socket.io":      <SiSocketdotio className="text-foreground" />,
  Figma:            <SiFigma className="text-pink-600" />,
  "UI/UX":          <SiTailwindcss className="text-sky-400" />,
  "Design System":  <SiTailwindcss className="text-sky-400" />,
  GraphQL:          <SiMongodb className="text-pink-500" />,
}

const projects = [
  {
    id: 1,
    title: "Real-Time Vehicle Tracking System",
    description:
      "A real-time vehicle tracking platform offering seamless fleet monitoring, live GPS positioning, and smart alerting.",
    image: "/Real-Time Vehicle Tracking System.jpg",
    category: "Web",
    tags: ["React", "Node.js", "MongoDB", "Socket.io"],
    liveUrl: "#",
    githubUrl: "https://github.com/Zakaria12e/vehicle-tracker-sys-frontend",
  },
  {
    id: 2,
    title: "Travel App",
    description:
      "A mobile app for travelers to discover and book unique experiences around the world.",
    image: "/coming-soon.jpg",
    category: "Mobile",
    tags: ["React", "framermotion", "Google Maps API"],
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    id: 3,
    title: "Dashboard UI",
    description:
      "A comprehensive admin dashboard with data visualization and user management.",
    image: "https://res.cloudinary.com/dectxiuco/image/upload/q_auto/f_auto/v1775142859/326_1x_shots_so_fwewwe.png",
    category: "Design",
    tags: ["Figma", "UI/UX", "Design System"],
    liveUrl: "#",
    githubUrl: "#",
  },
  {
    id: 4,
    title: "Social Media Platform",
    description:
      "A social platform focused on connecting creative professionals and showcasing their work.",
    image: "/coming-soon.jpg",
    category: "Web",
    tags: ["React", "GraphQL", "Socket.io"],
    liveUrl: "#",
    githubUrl: "#",
  },
]

const filters = ["All", "Web", "Mobile", "Design"]

export function ModernWork() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [current, setCurrent] = useState(0)
  const [macWidth, setMacWidth] = useState(420)

  useEffect(() => {
    const update = () => setMacWidth(window.innerWidth < 640 ? Math.min(window.innerWidth - 48, 320) : 420)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const filtered =
    activeFilter === "All" ? projects : projects.filter((p) => p.category === activeFilter)

  const prev = () => setCurrent((c) => (c - 1 + filtered.length) % filtered.length)
  const next = () => setCurrent((c) => (c + 1) % filtered.length)

  // Clamp index when filter changes
  const safeIndex = Math.min(current, filtered.length - 1)
  const project = filtered[safeIndex]

  return (
    <section id="work" className="py-24 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container">
        {/* Header */}
        <motion.div
          className="max-w-xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4" variant="secondary">Projects</Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 drop-shadow-[0_0_13px_rgba(59,59,59,1)] dark:drop-shadow-[0_0_20px_rgba(200,200,200,1)]">
            Featured Projects
          </h2>
          <p className="text-muted-foreground text-lg">
            Explore my recent work and discover how I bring ideas to life through code and design.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {filters.map((f) => (
              <Button
                key={f}
                variant={activeFilter === f ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => { setActiveFilter(f); setCurrent(0) }}
              >
                {f}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* MacBook showcase */}
        <AnimatePresence mode="wait">
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-5xl mx-auto"
          >
            {/* MacBook */}
            <div className="flex-shrink-0 flex justify-center w-full lg:w-auto">
              <MacbookPro src={project.image} width={macWidth} />
            </div>

            {/* Project info */}
            <div className="flex flex-col gap-5 text-center lg:text-left max-w-md">
              <div>
                <Badge variant="secondary" className="mb-3">{project.category}</Badge>
                <h3 className="text-2xl font-bold tracking-tight">{project.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{project.description}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-muted/50"
                  >
                    {tagIcons[tag] ?? null}
                    {tag}
                  </span>
                ))}
              </div>

              {/* Links */}
              <div className="flex gap-3 justify-center lg:justify-start">
                <Button size="sm" variant="outline" asChild>
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    Code
                  </a>
                </Button>
                <Button size="sm" asChild>
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Live Demo
                  </a>
                </Button>
              </div>

              {/* Navigation */}
              {filtered.length > 1 && (
                <div className="flex items-center gap-4 justify-center lg:justify-start mt-2">
                  <button
                    onClick={prev}
                    className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Dots */}
                  <div className="flex gap-1.5">
                    {filtered.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === safeIndex ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={next}
                    className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
