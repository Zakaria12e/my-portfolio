import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './page'
import MessagesPageWithOtp from '@/pages/CheckAuth'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from "@/components/ui/sonner"
import { SpeedInsights } from "@vercel/speed-insights/react"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/messages" element={<MessagesPageWithOtp />} />
        </Routes>
      </Router>
      <Toaster />
      <SpeedInsights />
    </ThemeProvider>
  )
}

export default App
