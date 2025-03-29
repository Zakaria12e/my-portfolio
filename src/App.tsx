import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './page'
import MessagesPageWithOtp from '@/pages/CheckAuth'
import { ThemeProvider } from '@/components/effects/theme-provider'
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/react"

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
      <Analytics />
    </ThemeProvider>
  )
}

export default App
