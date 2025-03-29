"use client"

import { useState, type JSX } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Github, ExternalLink, ArrowRight } from "lucide-react"
import {
  SiJavascript,
  SiTypescript,
  SiReact,
  SiMysql,
  SiPython,
  SiNodedotjs,
  SiExpress,
  SiMongodb,
  SiTailwindcss,
  SiGit,
  SiFigma,
  SiGooglemaps,
  SiSocketdotio,
  SiStripe,
} from "react-icons/si"

export function ModernWork() {
  const [activeFilter, setActiveFilter] = useState("All")

  const filters = ["All", "Web", "Mobile", "Design"]

  const projects = [
    {
      id: 1,
      title: "E-Commerce Platform",
      description: "A modern e-commerce platform with a seamless shopping experience and secure payment processing.",
      image: "coming-soon.jpg",
      category: "Web",
      tags: ["React", "Node.js", "MongoDB", "Stripe"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      id: 2,
      title: "Travel App",
      description: "A mobile app for travelers to discover and book unique experiences around the world.",
      image: "coming-soon.jpg",
      category: "Mobile",
      tags: ["React", "Firebase", "Google Maps API"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      id: 3,
      title: "Dashboard UI",
      description: "A comprehensive admin dashboard with data visualization and user management.",
      image: "coming-soon.jpg",
      category: "Design",
      tags: ["Figma", "UI/UX", "Design System"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      id: 4,
      title: "Social Media Platform",
      description: "A social platform focused on connecting creative professionals and showcasing their work.",
      image: "coming-soon.jpg",
      category: "Web",
      tags: ["React", "GraphQL", "Socket.io"],
      liveUrl: "#",
      githubUrl: "#",
    },
  ]

  const tagIcons: Record<string, JSX.Element> = {
    JavaScript: <SiJavascript className="mr-1 text-yellow-400" />,
    TypeScript: <SiTypescript className="mr-1 text-blue-500" />,
    React: <SiReact className="mr-1 text-cyan-400" />,
    "React Native": <SiReact className="mr-1 text-cyan-400" />,
    "Node.js": <SiNodedotjs className="mr-1 text-green-600" />,
    Express: <SiExpress className="mr-1 text-neutral-800" />,
    MongoDB: <SiMongodb className="mr-1 text-green-500" />,
    TailwindCSS: <SiTailwindcss className="mr-1 text-sky-400" />,
    Git: <SiGit className="mr-1 text-orange-500" />,
    MySQL: <SiMysql className="mr-1 text-blue-700" />,
    Python: <SiPython className="mr-1 text-blue-600" />,
    Firebase: <SiMongodb className="mr-1 text-yellow-400" />,
    GraphQL: <SiMongodb className="mr-1 text-pink-500" />,
    Stripe: <SiStripe className="mr-1 text-indigo-500" />,
    "Google Maps API": <SiGooglemaps className="mr-1 text-red-500" />,
    "Socket.io": <SiSocketdotio className="mr-1 text-black dark:text-white " />,
    Figma: <SiFigma className="mr-1 text-pink-600" />,
    "UI/UX": <SiTailwindcss className="mr-1 text-sky-400" />,
    "Design System": <SiTailwindcss className="mr-1 text-sky-400" />,
  }

  const filteredProjects =
    activeFilter === "All" ? projects : projects.filter((project) => project.category === activeFilter)

  return (
    <section id="work" className="py-24 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container">
        <motion.div
          className="max-w-xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium mb-4">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span>Available for work</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 drop-shadow-[0_0_13px_rgba(59,59,59,1)] dark:drop-shadow-[0_0_20px_rgba(200,200,200,1)]">
            Featured Projects
          </h2>

          <p className="text-muted-foreground text-lg">
            Explore my recent work and discover how I bring ideas to life through code and design.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </motion.div>
        

        <div className="grid md:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              className="group"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              
              <div className="bg-background/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={project.image || "/coming-soon.jpg"}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-background/30 backdrop-blur-sm border border-white/10 flex items-center gap-1 text-xs font-normal"
                      >
                        {tagIcons[tag] || null}
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Title */}
                    <h3 className="text-2xl font-extrabold mb-4 tracking-tight text-primary">{project.title}</h3>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 hover:bg-white/5 transition-colors"
                      asChild
                    >
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        Code
                      </a>
                    </Button>
                    <Button size="sm" className="bg-btnback text-primary/90 hover:bg-btnback/90 transition-colors" asChild>
                      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Live Demo
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-16">
          <Button variant="outline" size="lg" className="rounded-full px-8 group border-white/20 hover:bg-white/5">
            View All Projects
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  )
}

