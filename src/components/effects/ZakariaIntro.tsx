"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

const initialPath = { pathLength: 0, opacity: 0 }
const animatePath = { pathLength: 1, opacity: 1 }

type EffectProps = {
  className?: string
  speed?: number
  strokeColor?: string
  accentColor?: string
  strokeWidth?: number
  onComplete?: () => void
}

function ZakariaEffect({
  className = "",
  speed = 1,
  strokeColor = "currentColor",
  accentColor = "#7c15fa",
  strokeWidth = 10,
  onComplete,
}: EffectProps) {
  const calc = (value: number) => value * speed

  return (
    <motion.svg
      className={className}
      fill="none"
      initial={{ opacity: 1 }}
      preserveAspectRatio="xMidYMid meet"
      stroke={strokeColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={{ overflow: "visible" }}
      viewBox="0 58 720 172"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>zakaria</title>

      <motion.path animate={animatePath} d="M18 95 C28 93 58 90 105 92" initial={initialPath} transition={{ duration: calc(0.3), ease: "easeInOut", opacity: { duration: 0.15 } }} />
      <motion.path animate={animatePath} d="M105 92 C95 108 62 148 22 188" initial={initialPath} transition={{ duration: calc(0.35), ease: "easeInOut", delay: calc(0.3), opacity: { duration: 0.15, delay: calc(0.3) } }} />
      <motion.path animate={animatePath} d="M22 188 C42 186 72 185 112 187 C122 187 130 180 135 168" initial={initialPath} transition={{ duration: calc(0.35), ease: "easeInOut", delay: calc(0.65), opacity: { duration: 0.15, delay: calc(0.65) } }} />
      <motion.path animate={animatePath} d="M135 168 C128 142 136 108 162 96 C182 87 198 96 200 118 C202 140 188 168 168 184 C152 193 140 194 136 188 C130 178 135 162 148 155 C162 148 182 148 200 158 C210 164 216 174 218 186 C220 194 224 192 230 182" initial={initialPath} transition={{ duration: calc(0.7), ease: "easeOut", delay: calc(1), opacity: { duration: 0.35, delay: calc(1) } }} />
      <motion.path animate={animatePath} d="M230 182 C236 158 248 112 258 52 C262 30 268 16 278 12 C288 8 294 16 294 32 C294 52 286 82 276 118 C270 140 266 160 264 178" initial={initialPath} transition={{ duration: calc(0.6), ease: "easeInOut", delay: calc(1.7), opacity: { duration: 0.3, delay: calc(1.7) } }} />
      <motion.path animate={animatePath} d="M270 140 C282 128 298 112 318 102" initial={initialPath} transition={{ duration: calc(0.25), ease: "easeOut", delay: calc(2.3), opacity: { duration: 0.12, delay: calc(2.3) } }} />
      <motion.path animate={animatePath} d="M282 132 C292 148 306 168 318 182 C326 192 334 192 344 182" initial={initialPath} transition={{ duration: calc(0.35), ease: "easeOut", delay: calc(2.55), opacity: { duration: 0.15, delay: calc(2.55) } }} />
      <motion.path animate={animatePath} d="M344 182 C338 158 344 118 370 102 C390 92 408 100 410 122 C412 144 398 172 378 186 C362 196 348 196 344 188 C338 178 345 162 360 155 C376 148 396 150 412 162 C422 170 428 180 430 190 C432 196 436 194 442 182" initial={initialPath} transition={{ duration: calc(0.7), ease: "easeOut", delay: calc(2.9), opacity: { duration: 0.35, delay: calc(2.9) } }} />
      <motion.path animate={animatePath} d="M442 182 C446 162 454 132 462 112 C466 102 474 94 486 94 C498 94 504 104 502 118 C500 132 492 148 486 158 C480 168 478 176 482 186" initial={initialPath} transition={{ duration: calc(0.5), ease: "easeOut", delay: calc(3.6), opacity: { duration: 0.25, delay: calc(3.6) } }} />
      <motion.path animate={animatePath} d="M482 186 C488 192 496 190 502 178 C510 160 518 132 526 112 C530 102 536 96 544 96 C552 96 556 104 556 116 C556 132 550 155 544 172 C540 182 538 190 542 194" initial={initialPath} transition={{ duration: calc(0.5), ease: "easeOut", delay: calc(4.1), opacity: { duration: 0.25, delay: calc(4.1) } }} />
      <motion.path animate={animatePath} d="M536 72 C538 68 542 66 546 68 C550 70 550 76 546 80 C542 82 538 80 536 76" initial={initialPath} transition={{ duration: calc(0.15), ease: "easeOut", delay: calc(6.8), opacity: { duration: 0.08, delay: calc(6.8) } }} />
      <motion.path animate={animatePath} d="M542 194 C548 192 556 184 562 172 C558 148 564 114 590 100 C610 90 628 98 630 120 C632 142 618 170 598 186 C582 198 568 198 562 188 C556 178 564 160 580 152 C596 146 616 148 632 160 C644 170 650 182 652 192 C654 198 660 196 668 184" initial={initialPath} transition={{ duration: calc(0.7), ease: "easeOut", delay: calc(4.6), opacity: { duration: 0.35, delay: calc(4.6) } }} />
      <motion.path animate={animatePath} d="M668 184 C678 162 690 148 698 148 C706 148 706 158 700 172 C694 186 682 196 672 198" initial={initialPath} transition={{ duration: calc(0.3), ease: "easeOut", delay: calc(5.3), opacity: { duration: 0.15, delay: calc(5.3) } }} />
      <motion.circle animate={{ opacity: 1, scale: 1 }} cx="543" cy="74" fill={accentColor} initial={{ opacity: 0, scale: 0 }} r="5" stroke="none" transition={{ duration: calc(0.3), ease: "easeOut", delay: calc(6) }} />
      <motion.path animate={animatePath} d="M80 218 C180 228 380 232 560 222 C640 216 680 208 700 198" initial={initialPath} stroke={accentColor} transition={{ duration: calc(0.6), ease: "easeInOut", delay: calc(6.3), opacity: { duration: 0.3, delay: calc(6.3) } }} onAnimationComplete={onComplete} />
    </motion.svg>
  )
}

export function ZakariaIntro({ onComplete }: { onComplete: () => void }) {
  const [dismissing, setDismissing] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const finishIntro = () => {
    if (completedRef.current) return
    completedRef.current = true
    setDismissing(true)
    window.setTimeout(onComplete, 760)
  }

  return (
    <motion.div
      aria-label="Zakaria signature intro"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black text-white"
      initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      animate={{
        opacity: dismissing ? 0 : 1,
        scale: dismissing ? 1.06 : 1,
        filter: dismissing ? "blur(10px)" : "blur(0px)",
      }}
      transition={{
        duration: dismissing ? 0.72 : 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(0,0,0,0)_42%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: dismissing ? 1 : 0.35 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />

      <motion.div
        className="relative flex w-full max-w-[min(78vw,720px)] items-center justify-center px-6"
        animate={{
          opacity: dismissing ? 0 : 1,
          scale: dismissing ? 1.02 : 1,
          y: dismissing ? -8 : 0,
        }}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <ZakariaEffect
          accentColor="#7c15fa"
          className="h-auto w-full drop-shadow-[0_0_34px_rgba(250,204,21,0.34)]"
          speed={0.5}
          strokeColor="currentColor"
          strokeWidth={9}
          onComplete={finishIntro}
        />
      </motion.div>
    </motion.div>
  )
}
