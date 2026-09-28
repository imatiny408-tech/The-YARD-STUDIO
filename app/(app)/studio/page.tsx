"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VinylBlob } from "@/components/Logo";
import Room from "@/components/studio/Room";
import Mixer from "@/components/studio/Mixer";
import Pads from "@/components/studio/Pads";

const TABS = [
  { id: "room", label: "DAW-Sync Room", sub: "Lossless, host-synced listening with time-stamped feedback" },
  { id: "mixer", label: "Stem Mixer", sub: "8 stems, faders, solo/mute/pan, tempo and key" },
  { id: "pads", label: "Beat Pad", sub: "16 pads on QWERTY or MIDI, drop audio to auto-chop" },
] as const;

function Studio() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tab = (params.get("tab") as (typeof TABS)[number]["id"]) || "room";
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <VinylBlob className="h-10 w-10 text-[var(--color-lime)] [--hole:#221d1a]" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
            <p className="text-xs text-white/50">{cur.sub}</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => router.replace(`${path}?tab=${t.id}`, { scroll: false })}
              className={`rounded-full px-3.5 py-1.5 text-xs transition ${tab === t.id ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "room" && <Room />}
      {tab === "mixer" && <Mixer />}
      {tab === "pads" && <Pads />}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense>
      <Studio />
    </Suspense>
  );
}
