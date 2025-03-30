import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/effects/mode-toggle"

export function ModernHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Home", href: "#home" },
    { name: "Work", href: "#work" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ]

  return (
    <motion.header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-md border-b py-3" : "bg-transparent py-6"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container flex items-center justify-between">
        {/* Left: Logo */}
      <motion.div
     className="text-[30px] filter drop-shadow-[0_0_30px_rgba(95,95,95,1)] dark:drop-shadow-[0_0_100px_rgba(80,100,246,1)]"
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
    <img
        src="/moon-purple.png"
        alt="Moon"
        className="w-12 h-12 hidden dark:block"
      />
       <img
        src="/moon-dark.png"
        alt="Moon"
        className="w-12 h-12 block dark:hidden"
      />
    </motion.div>


        {/* Center: Navigation */}
        <nav className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-10">
  {navItems.map((item) => (
    <motion.a
      key={item.name}
      href={item.href}
      className="relative uppercase tracking-wide text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors "
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {item.name}
      <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-primary transition-all duration-300 hover:w-full"></span>
    </motion.a>
  ))}
</nav>



        {/* Right: Mode toggle & mobile menu */}
        <div className="flex items-center gap-2">
            <div className="mr-11 lg:mr-15"><ModeToggle /></div>
        
          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-6 mt-16">
                  {navItems.map((item, i) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      className="text-2xl font-medium hover:text-primary transition-colors"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      {item.name}
                    </motion.a>
                  ))}
                  <Button className="mt-4 rounded-full" size="lg">
                    Let's Talk
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  )
}


export function MessagesHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])


  return (
    <motion.header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-md border-b py-3" : "bg-transparent py-6"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container flex items-center justify-between">

       <motion.div
 className="text-[30px] filter drop-shadow-[0_0_30px_rgba(95,95,95,1)] dark:drop-shadow-[0_0_100px_rgba(80,100,246,1)]"
  whileHover={{ scale: 1.05 }}
  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
>
<img
        src="/moon-purple.png"
        alt="Moon"
        className="w-12 h-12 hidden dark:block"
      />
       <img
        src="/moon-dark.png"
        alt="Moon"
        className="w-12 h-12 block dark:hidden"
      />
</motion.div>

        <div className="flex items-center gap-2">
            <div className="mr-15"><ModeToggle /></div>
        
        </div>
      </div>
    </motion.header>
  )
}
