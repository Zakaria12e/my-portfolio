"use client"

import { useState , JSX } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Github, ExternalLink } from "lucide-react"
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
  SiStripe
} from "react-icons/si"

export function ModernWork() {
  const [activeFilter, setActiveFilter] = useState("All")

  const filters = ["All", "Web", "Mobile", "Design"]

  const projects = [
    {
      id: 1,
      title: "E-Commerce Platform",
      description: "A modern e-commerce platform with a seamless shopping experience and secure payment processing.",
      image: "under-construction.png",
      category: "Web",
      tags: ["React", "Node.js", "MongoDB", "Stripe"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      id: 2,
      title: "Travel App",
      description: "A mobile app for travelers to discover and book unique experiences around the world.",
      image: "under-construction.png",
      category: "Mobile",
      tags: ["React", "Firebase", "Google Maps API"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      id: 3,
      title: "Dashboard UI",
      description: "A comprehensive admin dashboard with data visualization and user management.",
      image: "under-construction.png",
      category: "Design",
      tags: ["Figma", "UI/UX", "Design System"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      id: 4,
      title: "Social Media Platform",
      description: "A social platform focused on connecting creative professionals and showcasing their work.",
      image: "under-construction.png",
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
    Firebase: <SiMongodb className="mr-1 text-yellow-400" />, // Placeholder
    GraphQL: <SiMongodb className="mr-1 text-pink-500" />, // Placeholder
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
          <Badge className="mb-4">My Work</Badge>
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

        <div className="grid md:grid-cols-2 gap-8">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              className="group relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="relative overflow-hidden rounded-xl">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.image || "/placeholder.svg"}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                  <p className="hidden sm:block text-gray-800 dark:text-muted-foreground mb-4">
  {project.description}
</p>

                  <div className="flex flex-wrap gap-2 mb-4">
  {project.tags.map((tag) => (
    <Badge
      key={tag}
      variant="secondary"
      className="bg-background/20 backdrop-blur-sm flex items-center gap-1"
    >
      {tagIcons[tag] || null}
      {tag}
    </Badge>
  ))}
</div>

                  <div className="flex gap-3">
                    <Button size="sm" variant="outline" className="bg-primary/90 dark:bg-background/20 backdrop-blur-sm" asChild>
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-white">
                        <Github className="mr-2 h-4 w-4 " />
                        Code
                      </a>
                    </Button>
                    <Button size="sm" className="bg-primary/90" asChild>
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
          <Button variant="outline" size="lg" className="rounded-full px-8">
            View All Projects
          </Button>
        </div>
      </div>
    </section>
  )
}

