"use client"

import { motion } from "framer-motion"
import type { JSX } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Palette, LayoutGrid, Download, Award, BookOpen, Briefcase, Lightbulb, Clock } from "lucide-react"
import { FaJava } from "react-icons/fa"
import { AboutStars } from "@/components/effects/stars"
import {
  SiJavascript,
  SiTypescript,
  SiReact,
  SiMysql,
  SiLaravel,
  SiPython,
  SiNodedotjs,
  SiExpress,
  SiMongodb,
  SiTailwindcss,
  SiSocketdotio,
  SiGit,
} from "react-icons/si"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export function ModernAbout() {
  const skills = [
    "JavaScript",
    "TypeScript",
    "Laravel",
    "React",
    "ShadCN UI",
    "Mysql",
    "Java",
    "Python",
    "Node.js",
    "Express",
    "MongoDB",
    "Socket.io",
    "Tailwind CSS",
    "Git",
  ]

  const skillIcons: { [key: string]: JSX.Element } = {
    JavaScript: <SiJavascript className="text-yellow-400" />,
    TypeScript: <SiTypescript className="text-blue-500" />,
    Laravel: <SiLaravel className="text-red-500" />,
    React: <SiReact className="text-cyan-400" />,
    "ShadCN UI": <LayoutGrid className="text-black dark:text-white w-4 h-4" />,
    Mysql: <SiMysql className="text-blue-600" />,
    Java: <FaJava className="text-red-600" />,
    Python: <SiPython className="text-yellow-500" />,
    "Node.js": <SiNodedotjs className="text-green-600" />,
    Express: <SiExpress className="text-black dark:text-white" />,
    "Socket.io": <SiSocketdotio className="text-black dark:text-white" />,
    MongoDB: <SiMongodb className="text-green-500" />,
    "Tailwind CSS": <SiTailwindcss className="text-sky-400" />,
    Git: <SiGit className="text-orange-500" />,
  }

  const skillColors: { [key: string]: string } = {
    JavaScript: "#FACC15",
    TypeScript: "#3B82F6",
    Laravel: "#EF4444",
    React: "#22D3EE",
    "ShadCN UI": "#000000",
    Mysql: "#2563EB",
    Java: "#DC2626",
    Python: "#EAB308",
    "Node.js": "#16A34A",
    Express: "#4B5563",
    MongoDB: "#22C55E",
    "Socket.io": "#4B5563",
    "Tailwind CSS": "#38BDF8",
    Git: "#F97316",
  }
  
  // NEW: Skill levels for progress bars
  const skillLevels = {
    JavaScript: 85,
    TypeScript: 80,
    Express: 90,
    Laravel: 70,
    React: 80,
    "ShadCN UI": 100, 
    MongoDB: 100,
    Java: 87,
    Mysql: 100,
    Python: 78,
    "Node.js": 75,
    "Socket.io": 60,
    "Tailwind CSS": 90,
    Git: 80,
  }

  const experiences = [
    {
      title: "Full-Stack Developer Intern",
      company: "Tech Support Solutions",
      period: "July 2023 – September 2023",
      description:
        "Developed a Help Desk web application to streamline IT support ticket management using Laravel and MySQL. Focused on CRUD operations, user authentication, and role-based access.",
    },
    {
      title: "Software Developer Intern",
      company: "SmartMail Technologies",
      period: "April 2023 – June 2023",
      description:
        "Built an internal Email Management System to organize and automate email workflows. Integrated features like user tagging, mail categorization, and real-time notifications.",
    },
  ]

  const education = [
    {
      degree: "High School Diploma (Baccalaureate)",
      institution: "National Secondary School",
      period: "2021",
      description: "Completed high school with a focus on science and technology.",
    },
    {
      degree: "University Diploma in Computer Science",
      institution: "Higher School of Technology, Sidi Bennour",
      period: "2022 - 2024",
      description: "Studied core topics in software development, databases, and computer systems.",
    },
    {
      degree: "Bachelor's Degree in Software and Systems Engineering",
      institution: "Higher School of Technology, Essaouira",
      period: "2024 - Present",
      description: "Pursuing advanced studies in systems architecture, software engineering, and project management.",
    },
  ]

  const services = [
    {
      icon: <Code className="h-10 w-10 text-primary" />,
      title: "Web Development",
      description: "Building fast, responsive, and user-friendly websites and web applications.",
    },
    {
      icon: <Palette className="h-10 w-10 text-primary" />,
      title: "UI/UX Design",
      description: "Creating intuitive and visually appealing user interfaces and experiences.",
    },
    {
      icon: <Briefcase className="h-10 w-10 text-primary" />,
      title: "Full-Stack Solutions",
      description: "Developing end-to-end applications with robust backend systems and polished frontends.",
    },
    {
      icon: <Lightbulb className="h-10 w-10 text-primary" />,
      title: "Technical Consultation",
      description: "Providing expert advice on technology choices, architecture, and implementation strategies.",
    },
  ]

  return (
    <section id="about" className="py-24 relative mb-[-50px]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container">
        <motion.div
          className="max-w-xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4">About Me</Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 drop-shadow-[0_0_13px_rgba(59,59,59,1)] dark:drop-shadow-[0_0_20px_rgba(200,200,200,1)]">
            My Journey & Expertise
          </h2>
          <p className="text-muted-foreground text-lg">
            A passionate developer with a keen eye for design and a commitment to creating exceptional digital
            experiences.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <motion.div
            className="relative aspect-square max-w-md mx-auto lg:mx-0"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <AboutStars />

            <span className="block w-full mx-auto filter drop-shadow-[0_0_100px_rgba(80,90,90,1)] dark:drop-shadow-[0_0_40px_rgba(200,200,200,1)]">
              <img
                src="/memoji-nbg.png"
                alt="programmer"
                className="w-[280px] sm:w-[400px] md:w-[550px] lg:w-[700px] xl:w-[850px] 2xl:w-[1000px] h-auto object-contain mx-auto"
              />
            </span>
          </motion.div>

          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-3xl font-bold">
              Hello, I'm{" "}
              <span className="text-primary drop-shadow-[0_0_13px_rgba(59,59,59,1)] dark:drop-shadow-[0_0_6px_rgba(200,200,200,1)]">
                Zakaria
              </span>
            </h3>
            <p className="text-muted-foreground">
              I'm a full-stack developer and passionate student with 3 years of hands-on experience building digital
              products that solve real-world problems. I love crafting web experiences that are both functional and
              visually engaging.
            </p>
            <p className="text-muted-foreground">
              With a strong foundation in both design and development, I approach every project with a balanced mindset
              — blending creativity with clean, efficient code to bring ideas to life.
            </p>

            {/* NEW: Personal facts */}
            <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-300" />
          <span className="text-sm">Available: 20hrs/week</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-yellow-500" />
          <span className="text-sm">3+ Years Experience</span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-red-500" />
          <span className="text-sm">Continuous Learner</span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-blue-400" />
          <span className="text-sm">10+ Projects Completed</span>
        </div>
        </div>
      </div>
              <h4 className="text-xl font-semibold mb-3 drop-shadow-[0_0_7px_rgba(59,59,59,1)] dark:drop-shadow-[0_0_7px_rgba(200,200,200,1)]">
                My Skills
              </h4>

            <div className="pt-4 flex justify-center">
              
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill}  className="flex items-center gap-2 rounded-full px-3 py-1 bg-transparent border text-gray-700 border-gray-300 dark:bg-transparent border border-muted text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    {skillIcons[skill]}
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

          
            <div className="pt-4">
              <Button className="flex items-center gap-2" variant="outline">
                <Download className="h-4 w-4" />
                Download Resume
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Skill progress bars */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-center mb-8">Skill Proficiency</h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {Object.entries(skillLevels)
              .slice(0, 8)
              .map(([skill, level], index) => (
                <motion.div
                  key={skill}
                  className="space-y-2"
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {skillIcons[skill]}
                      <span>{skill}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{level}%</span>
                  </div>
                  <div className="relative w-full">
                    <Progress value={0} className="h-2 bg-muted" />
                    <motion.div
                      className="absolute top-0 left-0 h-2 rounded-full"
                      initial={{ width: "0%" }}
                      whileInView={{ width: `${level}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                      style={{
                        backgroundColor: skillColors[skill],
                      }}
                    />
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Tabs defaultValue="experience" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-card">
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>

            <TabsContent value="experience" className="space-y-6">
              {experiences.map((exp, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-center gap-4 p-6 rounded-xl border bg-card text-card-foreground shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="text-center w-full">
                    <h4 className="text-xl font-semibold">{exp.title}</h4>
                    <p className="text-muted-foreground mb-2">
                      {exp.company} | {exp.period}
                    </p>
                    <p>{exp.description}</p>
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="education" className="space-y-6">
              {education.map((edu, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-center gap-4 p-6 rounded-xl border bg-card text-card-foreground shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="text-center w-full">
                    <h4 className="text-xl font-semibold">{edu.degree}</h4>
                    <p className="text-muted-foreground mb-2">
                      {edu.institution} | {edu.period}
                    </p>
                    <p>{edu.description}</p>
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="services" className="grid sm:grid-cols-2 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="mb-4">{service.icon}</div>
                  <h4 className="text-xl font-semibold mb-2">{service.title}</h4>
                  <p className="text-muted-foreground">{service.description}</p>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </section>
  )
}

