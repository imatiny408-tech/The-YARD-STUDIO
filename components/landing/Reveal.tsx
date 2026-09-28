"use client";

import { motion, useTransform, type MotionValue } from "motion/react";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const blur = useTransform(progress, range, [10, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <motion.span style={{ opacity, filter }} className="inline-block whitespace-pre">
      {word}{" "}
    </motion.span>
  );
}

/** Scroll-scrubbed word-by-word blur reveal, like the car site's statement copy. */
export default function Reveal({
  text,
  progress,
  from = 0,
  to = 1,
  className = "",
}: {
  text: string;
  progress: MotionValue<number>;
  from?: number;
  to?: number;
  className?: string;
}) {
  const words = text.split(" ");
  const span = (to - from) / words.length;
  return (
    <p className={className}>
      {words.map((w, i) => (
        <Word key={i} word={w} progress={progress} range={[from + i * span, from + (i + 1.6) * span]} />
      ))}
    </p>
  );
}
