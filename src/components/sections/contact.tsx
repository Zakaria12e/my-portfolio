"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Keyboard } from "@/components/ui/keyboard"
import { toast } from "sonner"
import { Mail, MapPin, Send } from "lucide-react"
import { cn } from "@/lib/utils"

type FieldName = "name" | "email" | "subject" | "message"

const KEY_CHAR_MAP: Record<string, [string, string]> = {
  Digit1: ["1", "!"], Digit2: ["2", "@"], Digit3: ["3", "#"],
  Digit4: ["4", "$"], Digit5: ["5", "%"], Digit6: ["6", "^"],
  Digit7: ["7", "&"], Digit8: ["8", "*"], Digit9: ["9", "("],
  Digit0: ["0", ")"], Minus: ["-", "_"], Equal: ["=", "+"],
  Backquote: ["`", "~"], BracketLeft: ["[", "{"], BracketRight: ["]", "}"],
  Backslash: ["\\", "|"], Semicolon: [";", ":"], Quote: ["'", '"'],
  Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"],
}

function keyCodeToChar(keyCode: string, shift: boolean): string | null {
  if (keyCode.startsWith("Key")) return shift ? keyCode.slice(3).toUpperCase() : keyCode.slice(3).toLowerCase()
  if (KEY_CHAR_MAP[keyCode]) return shift ? KEY_CHAR_MAP[keyCode][1] : KEY_CHAR_MAP[keyCode][0]
  if (keyCode === "Space") return " "
  return null
}

const FIELD_LABELS: Record<FieldName, string> = {
  name: "Your Name",
  email: "Your Email",
  subject: "Subject",
  message: "Message",
}

export function ModernContact() {
  const [formData, setFormData] = useState<Record<FieldName, string>>({
    name: "", email: "", subject: "", message: "",
  })
  const [focusedField, setFocusedField] = useState<FieldName | null>(null)
  const [shiftActive, setShiftActive] = useState(false)

  const focusedFieldRef = useRef<FieldName | null>(null)
  const shiftActiveRef = useRef(false)
  focusedFieldRef.current = focusedField
  shiftActiveRef.current = shiftActive

  // Select a field without keeping DOM focus (prevents browser scroll-to-input)
  const selectField = (field: FieldName, e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.blur()
    setFocusedField(field)
  }

  const handleVirtualKeyPress = (keyCode: string) => {
    const field = focusedFieldRef.current
    if (!field) return

    if (keyCode === "ShiftLeft" || keyCode === "ShiftRight" || keyCode === "CapsLock") {
      setShiftActive((s) => !s)
    } else if (keyCode === "Backspace") {
      setFormData((prev) => ({ ...prev, [field]: prev[field].slice(0, -1) }))
    } else if (keyCode === "Enter") {
      if (field === "message") setFormData((prev) => ({ ...prev, message: prev.message + "\n" }))
    } else {
      const char = keyCodeToChar(keyCode, shiftActiveRef.current)
      if (char !== null) {
        setFormData((prev) => ({ ...prev, [field]: prev[field] + char }))
        if (shiftActiveRef.current) setShiftActive(false)
      }
    }
  }

  // Capture physical keyboard — route through the same handler so no DOM input is needed
  useEffect(() => {
    if (!focusedField) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      // Let browser shortcuts pass (Ctrl, Meta, Alt combos)
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      handleVirtualKeyPress(e.code)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedField])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("https://portfolio-backend-ashen-tau.vercel.app/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast.success("Message sent! I'll get back to you soon.")
        setFormData({ name: "", email: "", subject: "", message: "" })
        setFocusedField(null)
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error sending message.")
    }
  }

  const fieldClass = (field: FieldName) =>
    cn(
      "rounded-lg border-muted-foreground/20 cursor-pointer transition-all duration-150",
      focusedField === field && "ring-2 ring-primary border-primary"
    )

  return (
    <section id="contact" className="py-24 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container">
        {/* Header */}
        <motion.div
          className="max-w-xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4" variant="secondary">Get In Touch</Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 drop-shadow-[0_0_13px_rgba(59,59,59,1)] dark:drop-shadow-[0_0_20px_rgba(200,200,200,1)]">
            Let's Work Together
          </h2>
          <p className="text-muted-foreground text-lg">
            Have a project in mind or want to discuss potential opportunities? I'd love to hear from you.
          </p>
        </motion.div>

        {/* Contact info + form */}
        <div className="grid lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
          {/* Left */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold">Contact Information</h3>
            <p className="text-muted-foreground">
              Feel free to reach out through any of these channels or fill out the contact form.
            </p>
            <div className="space-y-4 pt-2">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href="mailto:elbidali.zakaria@gmail.com" className="font-medium hover:text-primary transition-colors">
                      elbidali.zakaria@gmail.com
                    </a>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">Marrakech, MA</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      readOnly
                      name="name"
                      placeholder="Your Name"
                      value={formData.name}
                      onClick={(e) => selectField("name", e)}
                      className={fieldClass("name")}
                    />
                    <Input
                      readOnly
                      name="email"
                      placeholder="Your Email"
                      value={formData.email}
                      onClick={(e) => selectField("email", e)}
                      className={fieldClass("email")}
                    />
                  </div>
                  <Input
                    readOnly
                    name="subject"
                    placeholder="Subject"
                    value={formData.subject}
                    onClick={(e) => selectField("subject", e)}
                    className={fieldClass("subject")}
                  />
                  <Textarea
                    readOnly
                    name="message"
                    placeholder="Your Message"
                    value={formData.message}
                    onClick={(e) => selectField("message", e)}
                    className={cn(fieldClass("message"), "min-h-[130px]")}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-lg gap-2 dark:bg-black text-white dark:border dark:border-secondary-100 hover:bg-opacity-90 cursor-pointer transition-colors"
                  >
                    Send Message
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── Keyboard panel ─── */}
        <motion.div
          className="mt-16 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-5">
            {/* Text preview */}
            <div className="w-full max-w-2xl">
              <AnimatePresence mode="wait">
                {focusedField ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {FIELD_LABELS[focusedField]}
                        {shiftActive && <span className="ml-2 text-primary">⇧ Shift</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFocusedField(null)}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        esc
                      </button>
                    </div>
                    <div className="min-h-[40px] rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground flex items-center">
                      <span className="whitespace-pre-wrap break-all">
                        {formData[focusedField] || ""}
                      </span>
                      <span className="ml-px inline-block w-[2px] h-[1em] bg-foreground animate-pulse" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground py-2"
                  >
                    🎹 Click any field above — then type here or on your keyboard
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Keyboard */}
            <div className="overflow-x-auto w-full flex justify-center pb-1">
              <Keyboard
                enableSound
                onVirtualKeyPress={handleVirtualKeyPress}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
