import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/effects/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"


export const metadata = {
  title: "Portfolio",
  description: "My professional portfolio showcasing my work and skills",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-poppins">
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          {children}
           <Analytics /> 
          <SpeedInsights/>
        </ThemeProvider>
      </body>
    </html>
  )
}
