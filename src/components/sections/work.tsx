"use client"

import { useState, type JSX } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
      title: "Real-Time Vehicle Tracking System",
      description: "A real-time vehicle tracking platform offering seamless fleet monitoring, live GPS positioning, and smart alerting.",
      image: "Real-Time Vehicle Tracking System.jpg",
      category: "Web",
      tags: ["React", "Node.js", "MongoDB", "Socket.io"],
      liveUrl: "#",
      githubUrl: "https://github.com/Zakaria12e/vehicle-tracker-sys-frontend",
    },
    {
      id: 2,
      title: "Travel App",
      description: "A mobile app for travelers to discover and book unique experiences around the world.",
      image: "coming-soon.jpg",
      category: "Mobile",
      tags: ["React", "framermotion", "Google Maps API"],
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
    framermotion: (
      <img
        src="/fm.svg"
        alt="Framer Motion"
        className="mr-1 w-4 h-4 inline-block"
      />
    ),
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
    <section id="work" className="py-24 relative mb-[-100px]">
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
            <Badge className="mb-4" variant="secondary">
            Projects
            </Badge>
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

        <div className="grid md:grid-cols-4 gap-8">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              className="group"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="max-w-xs  dark:bg-background/5 backdrop-blur-sm dark:border-white/10 border-neutral-300 shadow-lg transition-transform duration-300 transform hover:scale-105">
               

                <CardContent className="text-[15px] text-muted-foreground px-5">
                 
                  <div className="mt-5 w-full aspect-video bg-muted rounded-xl overflow-hidden">
                    <img
                      src={project.image || "/coming-soon.jpg"}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                    <p className="mt-4 text-sm text-muted-foreground">{project.description}</p>
                    <div className="flex  mt-4 ">
                    {project.tags.map((tag) => (
                        <Badge
                        key={tag}
                        variant="secondary"
                      className="bg-background/30 backdrop-blur-sm  border-white/10 flex items-center  text-xs font-normal p-0"
                      >
                      {tagIcons[tag] || null}
                     
                      </Badge>
                    ))}
                    </div>
                </CardContent>

                <CardFooter className="px-5 gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-neutral-800 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-800 dark:text-white"
                    asChild
                  >
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      Code
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-neutral-800 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-800 dark:text-white"
                    asChild 
                  >
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Live Demo
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-16">
          <Button variant="outline" size="lg" className="rounded-full px-8 group border-neutral-800 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-800 dark:text-white">
            View All Projects
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  )
}

