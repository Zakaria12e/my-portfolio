import './App.css'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './page'
import { ThemeProvider } from '@/components/effects/theme-provider'
import { Toaster } from "@/components/ui/sonner"
import { ZakariaIntro } from '@/components/effects/ZakariaIntro'
import StarsCanvas from '@/components/effects/StarBackground'
import { ModernHeader } from '@/components/sections/header'


function App() {
  const [introVisible, setIntroVisible] = useState(true)

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StarsCanvas />
      <motion.div
        aria-hidden={introVisible}
        animate={{
          opacity: introVisible ? 0 : 1,
          filter: introVisible ? "brightness(0.42)" : "brightness(1)",
        }}
        initial={{ opacity: 0, filter: "brightness(0.42)" }}
        transition={{ duration: 0.72, ease: [0.4, 0, 0.2, 1] }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </motion.div>
      {/* Header outside filter wrapper so position:fixed works correctly */}
      <ModernHeader />
      <AnimatePresence>
        {introVisible && (
          <ZakariaIntro onComplete={() => setIntroVisible(false)} />
        )}
      </AnimatePresence>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
