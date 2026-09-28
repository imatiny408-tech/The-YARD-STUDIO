"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Lock, Plus, ShieldCheck, Snowflake, Unlock } from "lucide-react";
import { BOUNTIES, ME, type Bounty } from "@/lib/data";
import { escrowReducer, payoutBreakdown, type EscrowAction } from "@/lib/escrow";

const TODAY = "2026-09-28";

const ESCROW_UI: Record<Bounty["escrow"], { label: string; cls: string; Icon: typeof Lock }> = {
  unfunded: { label: "Not funded", cls: "bg-white/10 text-white/60", Icon: Lock },
  held: { label: "In escrow", cls: "bg-[var(--color-lilac)]/20 text-[var(--color-lilac)]", Icon: ShieldCheck },
  released: { label: "Released", cls: "bg-[var(--color-lime)]/20 text-[var(--color-lime)]", Icon: Unlock },
  frozen: { label: "Frozen · dispute", cls: "bg-[var(--color-signal)]/20 text-[var(--color-signal)]", Icon: Snowflake },
};

function NewBounty({ onCreate, onClose }: { onCreate: (b: Bounty) => void; onClose: () => void }) {
  const [f, setF] = useState({ title: "", type: "Mix 3 Songs", payout: 150, deadline: "2026-10-15", revisionCap: 2, tags: "Audio Engineer" });
  const [step, setStep] = useState<"form" | "pay">("form");
  const fee = payoutBreakdown(f.payout);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="rounded-3xl bg-white/[0.06] p-5">
      {step === "form" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (f.title.trim() && f.payout > 0) setStep("pay");
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="sm:col-span-2 text-xs text-white/55">Title<input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Looking for a cover art designer" className="field mt-1" /></label>
          <label className="text-xs text-white/55">Job type
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="field mt-1">
              {["Mix 3 Songs", "Master EP", "Design EP Cover", "Music Video", "Feature Verse", "Live Performance"].map((t) => <option key={t} className="bg-neutral-900">{t}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/55">Payout (USD)<input type="number" min={5} value={f.payout} onChange={(e) => setF({ ...f, payout: +e.target.value })} className="field mt-1" /></label>
          <label className="text-xs text-white/55">Deadline<input type="date" value={f.deadline} min={TODAY} onChange={(e) => setF({ ...f, deadline: e.target.value })} className="field mt-1 [color-scheme:dark]" /></label>
          <label className="text-xs text-white/55">Revision cap<input type="number" min={0} max={10} value={f.revisionCap} onChange={(e) => setF({ ...f, revisionCap: +e.target.value })} className="field mt-1" /></label>
          <label className="sm:col-span-2 text-xs text-white/55">Tags (comma separated)<input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className="field mt-1" /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-light">Continue to deposit</button>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="text-sm">Deposit into escrow</div>
          <div className="space-y-1 rounded-2xl bg-black/30 p-4 font-mono text-sm">
            <div className="flex justify-between"><span className="text-white/55">Bounty</span><span>${fee.amount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-white/55">Platform fee (5%, from payout)</span><span>-${fee.fee.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-white/55">Contractor receives</span><span>${fee.contractor.toFixed(2)}</span></div>
          </div>
          <p className="text-[11px] text-white/45">Funds sit in a locked holding account and release only when you approve a deliverable. Demo mode, no card is charged.</p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                onCreate({
                  id: `b${Date.now()}`,
                  title: f.title,
                  type: f.type,
                  payout: f.payout,
                  deadline: f.deadline,
                  poster: ME.name,
                  city: ME.city,
                  escrow: "held",
                  status: "open",
                  revisionCap: f.revisionCap,
                  revisions: 0,
                  tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
                  submissions: [],
                })
              }
              className="btn btn-signal"
            >
              <Lock size={14} /> Deposit ${f.payout}
            </button>
            <button onClick={() => setStep("form")} className="btn btn-ghost">Back</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function BountiesPage() {
  const [list, setList] = useState<Bounty[]>(BOUNTIES);
  const [sel, setSel] = useState(BOUNTIES[0].id);
  const [creating, setCreating] = useState(false);
  const [pitch, setPitch] = useState("");
  const b = list.find((x) => x.id === sel) ?? list[0];
  const mine = b.poster === ME.name;

  const act = (a: EscrowAction) => setList((l) => l.map((x) => (x.id === b.id ? escrowReducer(x, a) : x)));
  const E = ESCROW_UI[b.escrow];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bounties</h1>
          <p className="text-xs text-white/50">Post a job, hold funds in escrow, release on approval.</p>
        </div>
        <button onClick={() => setCreating((c) => !c)} className="btn btn-light text-xs"><Plus size={14} /> Post a bounty</button>
      </div>

      <AnimatePresence>
        {creating && (
          <NewBounty
            onClose={() => setCreating(false)}
            onCreate={(nb) => {
              setList((l) => [nb, ...l]);
              setSel(nb.id);
              setCreating(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-2">
          {list.map((x) => {
            const U = ESCROW_UI[x.escrow];
            return (
              <button key={x.id} onClick={() => setSel(x.id)} className={`w-full rounded-2xl p-4 text-left transition ${x.id === b.id ? "bg-white/[0.1]" : "bg-white/[0.04] hover:bg-white/[0.07]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{x.title}</div>
                    <div className="mt-0.5 text-[11px] text-white/45">{x.poster} · {x.city}</div>
                  </div>
                  <div className="text-lg font-semibold">${x.payout}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${U.cls}`}><U.Icon size={10} />{U.label}</span>
                  {x.tags.map((t) => <span key={t} className="rounded-full bg-white/8 px-2 py-0.5 text-white/60">{t}</span>)}
                  <span className="ml-auto flex items-center gap-1 text-white/40"><Calendar size={10} />{x.deadline}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 rounded-3xl bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-white/45">{b.type}</div>
              <div className="text-xl font-semibold tracking-tight">{b.title}</div>
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${E.cls}`}><E.Icon size={12} />{E.label}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {(["unfunded", "held", "released"] as const).map((s, i) => {
              const order = { unfunded: 0, held: 1, released: 2, frozen: 1 }[b.escrow];
              return (
                <div key={s} className="space-y-1">
                  <div className={`h-1.5 rounded-full ${i <= order ? (b.escrow === "frozen" && i === 1 ? "bg-[var(--color-signal)]" : "bg-white") : "bg-white/10"}`} />
                  <div className="text-[10px] text-white/50">{["Posted", "Funded", "Released"][i]}</div>
                </div>
              );
            })}
            <div className="space-y-1">
              <div className={`h-1.5 rounded-full ${b.revisions > b.revisionCap ? "bg-[var(--color-signal)]" : "bg-white/10"}`} />
              <div className="text-[10px] text-white/50">Revisions {b.revisions}/{b.revisionCap}</div>
            </div>
          </div>

          {b.escrow === "unfunded" && mine && (
            <button onClick={() => act({ type: "fund" })} className="btn btn-signal w-full"><Lock size={14} /> Deposit ${b.payout} to escrow</button>
          )}
          {b.escrow === "unfunded" && !mine && <p className="text-xs text-white/50">The poster hasn&apos;t funded this yet. Pitches are open, but payment isn&apos;t protected until it&apos;s funded.</p>}

          <div className="flex items-center justify-between text-sm">
            <span>Submissions ({b.submissions.length})</span>
            <button onClick={() => act({ type: "check_deadline", today: "2026-12-31" })} className="text-[11px] text-white/35 hover:text-white/70">Simulate missed deadline</button>
          </div>

          <div className="space-y-2">
            {b.submissions.map((s) => (
              <div key={s.id} className="rounded-2xl bg-black/25 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{s.by}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/45">{s.status} · {s.at}</span>
                </div>
                <div className="mt-1 text-xs text-white/60">{s.note}</div>
                <div className="relative mt-2 h-10 overflow-hidden rounded-lg bg-white/5">
                  <div className="absolute inset-0 flex items-center gap-[2px] px-2">
                    {Array.from({ length: 60 }, (_, i) => <div key={i} className="flex-1 rounded-full bg-white/40" style={{ height: `${20 + Math.abs(Math.sin(i * 0.7 + s.id.length)) * 70}%` }} />)}
                  </div>
                  {b.escrow !== "released" && <div className="absolute inset-0 grid place-items-center bg-black/30 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">Watermarked preview</div>}
                </div>
                {mine && s.status === "pending" && b.escrow !== "released" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={b.escrow !== "held"} onClick={() => act({ type: "approve", submissionId: s.id })} className="btn btn-light text-xs disabled:opacity-40">Approve & release ${payoutBreakdown(b.payout).contractor.toFixed(0)}</button>
                    <button onClick={() => act({ type: "revise", submissionId: s.id })} className="btn btn-ghost text-xs">Request revision</button>
                    <button onClick={() => act({ type: "reject", submissionId: s.id })} className="btn btn-ghost text-xs">Reject</button>
                  </div>
                )}
                {mine && s.status === "revision" && b.escrow === "held" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => act({ type: "approve", submissionId: s.id })} className="btn btn-light text-xs">Approve & release</button>
                    <button onClick={() => act({ type: "revise", submissionId: s.id })} className="btn btn-ghost text-xs">Another revision</button>
                  </div>
                )}
              </div>
            ))}
            {!b.submissions.length && <div className="rounded-2xl bg-black/20 p-4 text-center text-xs text-white/45">No submissions yet.</div>}
          </div>

          {!mine && b.escrow !== "released" && b.escrow !== "frozen" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pitch.trim()) return;
                act({ type: "submit", submission: { id: `s${Date.now()}`, by: ME.name, note: pitch, at: "just now", status: "pending" } });
                setPitch("");
              }}
              className="flex gap-2"
            >
              <input value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Pitch + link your demo" className="field" />
              <button className="btn btn-light shrink-0 text-xs">Submit</button>
            </form>
          )}
          {b.escrow === "frozen" && <p className="rounded-2xl bg-[var(--color-signal)]/10 p-3 text-xs text-[var(--color-signal)]">Funds are frozen. The revision cap was exceeded or the deadline passed, so a Yard moderator reviews both sides before release or refund.</p>}
          {b.escrow === "released" && <p className="rounded-2xl bg-[var(--color-lime)]/10 p-3 text-xs text-[var(--color-lime)]">Paid out. Full-resolution files are unlocked for the hirer.</p>}
        </div>
      </div>
    </div>
  );
}
