"use client";

import { motion } from "framer-motion";
import { Github, Linkedin } from "lucide-react";
import { SiX } from "react-icons/si";
import { ProjectButton } from "@/components/effects/GlowEffectButton";
import { TextLoop } from "@/components/effects/text-loop";
import StarsCanvas from "@/components/effects/StarBackground";
import {HeroStars} from "@/components/effects/stars";
export function ModernHero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-10 mb-[-100px]"
    >
      {/* Background elements */}
      <StarsCanvas />
      <div className="container grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex whitespace-pre-wrap text-sm inline-block rounded-full bg-transparent px-4 py-1.5 font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
            Hello I'm{" "}
            <TextLoop
              className="overflow-y-clip"
              transition={{
                type: "spring",
                stiffness: 900,
                damping: 80,
                mass: 10,
              }}
              variants={{
                initial: {
                  y: 20,
                  rotateX: 90,
                  opacity: 0,
                  filter: "blur(4px)",
                },
                animate: {
                  y: 0,
                  rotateX: 0,
                  opacity: 1,
                  filter: "blur(0px)",
                },
                exit: {
                  y: -20,
                  rotateX: -90,
                  opacity: 0,
                  filter: "blur(4px)",
                },
              }}
            >
              <span>Student 🧑‍🎓</span>
              <span>Developer 🧑‍💻</span>
              <span>Designer 🧑‍🎨</span>
              <span>Gamer 🎮</span>
            </TextLoop>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight drop-shadow-[0_0_30px_rgba(95,95,95,1)] dark:drop-shadow-[0_0_30px_rgba(100,100,246,1)]">
            Creating digital experiences that matter
          </h1>

          <p className="text-l text-muted-foreground max-w-md">
            I design and build exceptional digital experiences that are fast,
            accessible, and visually appealing.
          </p>

          <div className="flex items-center gap-8 pt-4">
            <ProjectButton />

            <motion.a
              href="https://github.com/Zakaria12e"
              target="_blank"
              whileHover={{ y: -5, color: "#333" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              rel="noreferrer"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </motion.a>
            <motion.a
              href="https://linkedin.com"
              target="_blank"
              whileHover={{ y: -5, color: "#0077b5" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              rel="noreferrer"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </motion.a>
            <motion.a
              href="https://x.com/Z_ElBidali"
              target="_blank"
              whileHover={{ y: -5, color: "#cccccc" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              rel="noreferrer"
            >
              <SiX className="h-5 w-5" />

              <span className="sr-only">X</span>
            </motion.a>
          </div>
        </motion.div>

        <motion.div
          className="relative aspect-square max-w-md mx-auto lg:mx-0"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <HeroStars />
          <span className="block mx-auto relative w-fit w:left-5 mb-[-30px] lg:left-13 drop-shadow-[0_0_30px_rgba(95,95,95,1)] dark:drop-shadow-[0_0_30px_rgba(160,100,246,1)] dark:drop-shadow-[0_0_20px_rgba(120,100,246,1)] ">
            <img
              src="/mainIcons.svg"
              alt="Light mode svg"
              className="w-[230px] sm:w-[280px] md:w-[310px] lg:w-[400px] h-auto object-contain mx-auto block dark:hidden translate-x-4"
            />

            <img
              src="/mainIconsdark.svg"
              alt="Dark mode svg"
              className="w-[260px] sm:w-[280px] md:w-[310px] lg:w-[400px] h-auto object-contain mx-auto hidden dark:block translate-x-4"
            />
          </span>
        </motion.div>
      </div>
    </section>
  );
}
