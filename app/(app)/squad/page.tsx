"use client";

import { useMemo, useState } from "react";
import { Check, FileAudio, Lock, ShieldCheck, Upload, X } from "lucide-react";
import Cover from "@/components/Cover";
import { CommunityMark } from "@/components/Logo";
import { SQUAD, VAULT, type SquadRole, type VaultFile, type VaultKind } from "@/lib/data";

const PERMS: { key: string; label: string; roles: SquadRole[] }[] = [
  { key: "view", label: "View vault", roles: ["Owner", "Executive Producer", "Contributor"] },
  { key: "upload", label: "Upload files", roles: ["Owner", "Executive Producer", "Contributor"] },
  { key: "approve", label: "Approve split sheets", roles: ["Owner", "Executive Producer"] },
  { key: "download", label: "Download locked masters", roles: ["Owner", "Executive Producer"] },
  { key: "members", label: "Manage members", roles: ["Owner"] },
  { key: "payout", label: "Set payout destination", roles: ["Owner"] },
];

const can = (role: SquadRole, key: string) => PERMS.find((p) => p.key === key)!.roles.includes(role);
const KINDS: VaultKind[] = ["V1", "V2", "Final Master", "Instrumental", "Stems", "Artwork"];

async function sha256(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const size = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export default function SquadPage() {
  const [members, setMembers] = useState(SQUAD.members);
  const [actingAs, setActingAs] = useState(members[0].id);
  const [files, setFiles] = useState<VaultFile[]>(VAULT);
  const [song, setSong] = useState("Glass House (Remix)");
  const [kind, setKind] = useState<VaultKind>("V2");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [verify, setVerify] = useState<Record<string, "ok" | "bad">>({});
  const [hashes, setHashes] = useState<Record<string, string>>({});

  const me = members.find((m) => m.id === actingAs)!;
  const songs = useMemo(() => [...new Set(files.map((f) => f.song))], [files]);

  const upload = async (list: FileList | null) => {
    if (!list?.length || !can(me.role, "upload")) return;
    setBusy(true);
    const added: VaultFile[] = [];
    for (const f of Array.from(list)) {
      const full = await sha256(f);
      const id = `f${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
      setHashes((h) => ({ ...h, [id]: full }));
      added.push({ id, song, kind, name: f.name, size: size(f.size), by: me.name, at: "Just now", checksum: full.slice(0, 8), locked: kind === "Final Master" || kind === "Stems" });
    }
    setFiles((fs) => [...added, ...fs]);
    setBusy(false);
  };

  // Re-hash a local copy and compare with the stored checksum.
  const verifyFile = async (vf: VaultFile, local: File) => {
    const h = await sha256(local);
    const expected = hashes[vf.id];
    setVerify((v) => ({ ...v, [vf.id]: (expected ? h === expected : h.startsWith(vf.checksum)) ? "ok" : "bad" }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-lilac)] text-white">
            <CommunityMark className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{SQUAD.name}</h1>
            <p className="text-xs text-white/50">{members.length} members · {files.length} files in the Camp Vault</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/55">
          Viewing as
          <select value={actingAs} onChange={(e) => setActingAs(e.target.value)} className="field w-auto py-1.5">
            {members.map((m) => <option key={m.id} value={m.id} className="bg-neutral-900">{m.name} · {m.role}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
            className={`flex flex-wrap items-center gap-3 rounded-3xl border border-dashed p-4 transition ${drag ? "border-[var(--color-signal)] bg-[var(--color-signal)]/10" : "border-white/15 bg-white/[0.03]"}`}
          >
            <Upload size={18} className="text-white/60" />
            <div className="min-w-[200px] flex-1 text-sm">
              {busy ? "Hashing…" : "Drop files into the vault"}
              <div className="text-[11px] text-white/45">SHA-256 checksum is computed in your browser before upload.</div>
            </div>
            <select value={song} onChange={(e) => setSong(e.target.value)} className="field w-auto py-1.5 text-xs">
              {songs.map((s) => <option key={s} className="bg-neutral-900">{s}</option>)}
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value as VaultKind)} className="field w-auto py-1.5 text-xs">
              {KINDS.map((k) => <option key={k} className="bg-neutral-900">{k}</option>)}
            </select>
            <label className={`btn btn-light cursor-pointer text-xs ${can(me.role, "upload") ? "" : "pointer-events-none opacity-40"}`}>
              Choose
              <input type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </label>
          </div>

          {songs.map((s) => (
            <div key={s} className="rounded-3xl bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-3">
                <Cover seed={s} hue={s.length * 23} className="h-10 w-10 rounded-xl" />
                <div className="text-sm font-medium">{s}</div>
              </div>
              <div className="space-y-1.5">
                {files
                  .filter((f) => f.song === s)
                  .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
                  .map((f) => {
                    const blocked = f.locked && !can(me.role, "download");
                    return (
                      <div key={f.id} className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2">
                        <span className={`w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-[10px] font-semibold ${f.kind === "Final Master" ? "bg-[var(--color-signal)] text-white" : "bg-white/10 text-white/70"}`}>{f.kind}</span>
                        <FileAudio size={14} className="hidden shrink-0 text-white/40 sm:block" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{f.name}</div>
                          <div className="truncate text-[11px] text-white/40">
                            {f.size} · {f.by} · {f.at} · <span className="font-mono" title={hashes[f.id] ?? f.checksum}>sha {f.checksum}</span>
                          </div>
                        </div>
                        <label className="shrink-0 cursor-pointer text-[10px] text-white/40 hover:text-white" title="Pick your local copy to verify its checksum">
                          {verify[f.id] === "ok" ? <span className="flex items-center gap-1 text-[var(--color-lime)]"><ShieldCheck size={12} /> verified</span> : verify[f.id] === "bad" ? <span className="flex items-center gap-1 text-[var(--color-signal)]"><X size={12} /> mismatch</span> : "verify"}
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && verifyFile(f, e.target.files[0])} />
                        </label>
                        {blocked ? <Lock size={13} className="shrink-0 text-white/40" /> : <Check size={13} className="shrink-0 text-white/40" />}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white/[0.04] p-4">
            <div className="mb-3 text-sm">Members</div>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-1.5">
                <Cover seed={m.id} hue={m.hue} className="h-8 w-8 rounded-full" />
                <span className="flex-1 truncate text-sm">{m.name}</span>
                {can(me.role, "members") && m.role !== "Owner" ? (
                  <select value={m.role} onChange={(e) => setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, role: e.target.value as SquadRole } : x)))} className="field w-auto max-w-[140px] shrink py-1 text-[11px]">
                    <option className="bg-neutral-900">Executive Producer</option>
                    <option className="bg-neutral-900">Contributor</option>
                  </select>
                ) : (
                  <span className="text-[11px] text-white/50">{m.role}</span>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-white/[0.04] p-4">
            <div className="mb-3 text-sm">Permission matrix</div>
            <div className="grid grid-cols-[1fr_repeat(3,40px)] gap-y-2 text-[11px]">
              <span />
              {["Own", "EP", "Con"].map((r) => <span key={r} className="text-center text-white/45">{r}</span>)}
              {PERMS.map((p) => (
                <div key={p.key} className="contents">
                  <span className={can(me.role, p.key) ? "text-white" : "text-white/40"}>{p.label}</span>
                  {(["Owner", "Executive Producer", "Contributor"] as SquadRole[]).map((r) => (
                    <span key={r} className="grid place-items-center">
                      {p.roles.includes(r) ? <Check size={13} className={r === me.role ? "text-[var(--color-lime)]" : "text-white/60"} /> : <span className="h-1 w-1 rounded-full bg-white/20" />}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-white/40">Switch &quot;Viewing as&quot; to see how each role&apos;s access changes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
