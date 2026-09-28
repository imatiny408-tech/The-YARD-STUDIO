import type { Bounty, Submission } from "./data";

// Escrow state machine shared by the bounty board UI. The server-side
// version runs the same transitions against Stripe Connect (PaymentIntent with
// manual transfer → Transfer on release, refund on dispute resolution).

export type EscrowAction =
  | { type: "fund" }
  | { type: "submit"; submission: Submission }
  | { type: "approve"; submissionId: string }
  | { type: "reject"; submissionId: string }
  | { type: "revise"; submissionId: string }
  | { type: "check_deadline"; today: string };

export const PLATFORM_FEE = 0.05;

export function payoutBreakdown(amount: number) {
  const fee = Math.round(amount * PLATFORM_FEE * 100) / 100;
  return { amount, fee, contractor: amount - fee };
}

export function escrowReducer(b: Bounty, a: EscrowAction): Bounty {
  if (b.escrow === "released") return b;
  switch (a.type) {
    case "fund":
      return b.escrow === "unfunded" ? { ...b, escrow: "held" } : b;
    case "submit":
      if (b.escrow === "frozen") return b;
      return { ...b, status: "in_review", submissions: [a.submission, ...b.submissions] };
    case "approve":
      // Deliverables can only be approved (and funds released) when escrow is held.
      if (b.escrow !== "held") return b;
      return {
        ...b,
        escrow: "released",
        status: "approved",
        submissions: b.submissions.map((s) => ({ ...s, status: s.id === a.submissionId ? "approved" : s.status === "pending" ? "rejected" : s.status })),
      };
    case "reject":
      return { ...b, submissions: b.submissions.map((s) => (s.id === a.submissionId ? { ...s, status: "rejected" } : s)) };
    case "revise": {
      const revisions = b.revisions + 1;
      // Automated hold: past the revision cap, funds freeze pending dispute review.
      if (revisions > b.revisionCap) return { ...b, revisions, status: "disputed", escrow: b.escrow === "held" ? "frozen" : b.escrow };
      return { ...b, revisions, status: "revision", submissions: b.submissions.map((s) => (s.id === a.submissionId ? { ...s, status: "revision" } : s)) };
    }
    case "check_deadline":
      if (a.today > b.deadline && b.status !== "approved" && b.escrow === "held") return { ...b, status: "disputed", escrow: "frozen" };
      return b;
  }
}
