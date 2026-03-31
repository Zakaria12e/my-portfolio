"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

type Key = {
  label: string;
  className?: string;
};

const Row = ({ keys, offset = false }: { keys: Key[]; offset?: boolean }) => {
  return (
    <div
      className={cn(
        "flex flex-row gap-1 mb-1",
        offset && "ml-4"
      )}
    >
      {keys.map((key, idx) => (
        <SingleKey key={idx} {...key} />
      ))}
    </div>
  );
};

const SingleKey = ({
  label,
  className,
}: {
  label: string;
  className?: string;
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      animate={
        pressed
          ? { y: 2, boxShadow: "0px 0px 0px 0px rgba(0,0,0,0)" }
          : { y: 0, boxShadow: "0px 4px 0px 0px rgba(0,0,0,0.4)" }
      }
      className={cn(
        "relative h-8 min-w-[2rem] px-2 rounded-md text-[11px] font-medium",
        "bg-neutral-100 dark:bg-neutral-800",
        "border border-neutral-200 dark:border-neutral-700",
        "text-neutral-700 dark:text-neutral-300",
        "flex items-center justify-center cursor-pointer select-none",
        "hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
        "shadow-[0px_4px_0px_0px_rgba(0,0,0,0.35)] dark:shadow-[0px_4px_0px_0px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {label}
    </motion.button>
  );
};

export const Keyboard = ({ className }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false });
  const controls = useAnimation();

  const row1: Key[] = [
    { label: "`" },
    { label: "1" },
    { label: "2" },
    { label: "3" },
    { label: "4" },
    { label: "5" },
    { label: "6" },
    { label: "7" },
    { label: "8" },
    { label: "9" },
    { label: "0" },
    { label: "-" },
    { label: "=" },
    { label: "⌫", className: "min-w-[3.5rem]" },
  ];

  const row2: Key[] = [
    { label: "⇥", className: "min-w-[3rem]" },
    { label: "Q" },
    { label: "W" },
    { label: "E" },
    { label: "R" },
    { label: "T" },
    { label: "Y" },
    { label: "U" },
    { label: "I" },
    { label: "O" },
    { label: "P" },
    { label: "[" },
    { label: "]" },
    { label: "\\", className: "min-w-[2.5rem]" },
  ];

  const row3: Key[] = [
    { label: "⇪", className: "min-w-[3.5rem]" },
    { label: "A" },
    { label: "S" },
    { label: "D" },
    { label: "F" },
    { label: "G" },
    { label: "H" },
    { label: "J" },
    { label: "K" },
    { label: "L" },
    { label: ";" },
    { label: "'" },
    { label: "↵", className: "min-w-[4rem]" },
  ];

  const row4: Key[] = [
    { label: "⇧", className: "min-w-[5rem]" },
    { label: "Z" },
    { label: "X" },
    { label: "C" },
    { label: "V" },
    { label: "B" },
    { label: "N" },
    { label: "M" },
    { label: "," },
    { label: "." },
    { label: "/" },
    { label: "⇧", className: "min-w-[5rem]" },
  ];

  const row5: Key[] = [
    { label: "fn" },
    { label: "⌃" },
    { label: "⌥" },
    { label: "⌘", className: "min-w-[3rem]" },
    { label: "", className: "min-w-[12rem]" },
    { label: "⌘", className: "min-w-[3rem]" },
    { label: "⌥" },
    { label: "◂" },
    { label: "▾" },
    { label: "▸" },
  ];

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  return (
    <div
      ref={ref}
      className={cn(
        "p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 inline-block",
        "shadow-lg",
        className
      )}
    >
      <Row keys={row1} />
      <Row keys={row2} />
      <Row keys={row3} />
      <Row keys={row4} />
      <Row keys={row5} />
    </div>
  );
};
