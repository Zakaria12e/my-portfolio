"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const GITHUB_USERNAME = "Zakaria12e"
const WEEKS = 30

type Day = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }

const LEVELS = [
  "bg-neutral-200 dark:bg-muted",
  "bg-neutral-400 dark:bg-[#3b2560]",
  "bg-neutral-600 dark:bg-[#6b3fa0]",
  "bg-neutral-800 dark:bg-[#8b48d4]",
  "bg-black dark:bg-[#a855f7]",
]

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const monthOf = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", timeZone: "UTC" })

function toWeeks(days: Day[]): (Day | null)[][] {
  const weeks: (Day | null)[][] = []
  let current: (Day | null)[] = Array(new Date(days[0].date).getUTCDay()).fill(null)
  for (const d of days) {
    current.push(d)
    if (current.length === 7) {
      weeks.push(current)
      current = []
    }
  }
  if (current.length) weeks.push(current)
  return weeks
}

export function ActivityHeatmap() {
  const [days, setDays] = useState<Day[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed")
        return r.json()
      })
      .then((j) => setDays(j.contributions))
      .catch(() => setError(true))
  }, [])

  const { weeks, total, labels } = useMemo(() => {
    if (!days) return { weeks: [] as (Day | null)[][], total: 0, labels: [] as string[] }
    const weeks = toWeeks(days).slice(-WEEKS)
    const total = weeks.flat().reduce((s, d) => s + (d?.count ?? 0), 0)
    const first = (w: (Day | null)[]) => w.find(Boolean)!.date
    const labels = weeks.map((w, i) => {
      const m = monthOf(first(w))
      return i === 0 || m !== monthOf(first(weeks[i - 1])) ? m : ""
    })
    return { weeks, total, labels }
  }, [days])

  return (
    <motion.div
      className="mx-auto w-full max-w-3xl rounded-2xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">
          Activity Heatmap
        </h3>
        <p className="text-sm font-semibold tabular-nums sm:text-base">
          {days ? total : "–"}{" "}
          <span className="text-[11px] font-normal text-muted-foreground sm:text-xs">contributions</span>
        </p>
      </div>

      {/* Grid */}
      <div className="mt-3 flex w-full flex-col items-center rounded-xl bg-background/60 p-3 dark:bg-black/40 sm:p-4">
        {error ? (
          <p className="py-8 text-xs text-muted-foreground">Couldn't load GitHub activity.</p>
        ) : !days ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <TooltipProvider delayDuration={0}>
            <div
              role="img"
              aria-label={`${total} GitHub contributions in the last ${WEEKS} weeks`}
              className="grid w-full max-w-[560px] gap-[3px] sm:gap-1"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {weeks.map((w, i) => (
                <div key={i} className="flex flex-col gap-[3px] sm:gap-1">
                  <span className="h-3.5 whitespace-nowrap font-mono text-[9px] text-muted-foreground">
                    {labels[i]}
                  </span>
                  {w.map((d, j) =>
                    d ? (
                      <Tooltip key={d.date}>
                        <TooltipTrigger asChild>
                          <div
                            className={`aspect-square w-full rounded-[3px] transition hover:scale-125 hover:ring-1 hover:ring-foreground/40 ${LEVELS[d.level]}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="px-2 py-1 font-mono text-[11px]">
                          <strong>{d.count}</strong> contributions · {fmt(d.date)}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={j} className="aspect-square w-full" />
                    )
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground sm:text-[11px]">
        <a
          href={`https://github.com/${GITHUB_USERNAME}`}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-foreground"
        >
          @{GITHUB_USERNAME}
        </a>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {LEVELS.map((c, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </motion.div>
  )
}