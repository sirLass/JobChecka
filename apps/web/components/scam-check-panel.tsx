import { LIMITS_STATEMENT } from "@jobsafe/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildVerificationLinks, type VerificationInput } from "@/lib/verification/links";

/**
 * Scam-check verdict panel (PRD 5.2 "Output shown to the user").
 * Word rules: results describe warning signs, never certify anything as safe
 * or legit, and never accuse a named company. Server component — no client JS.
 */

export interface CheckRuleHit {
  id: string;
  severity: "low" | "medium" | "high";
  evidence: string;
  explanation: string;
}

export interface ScamCheckView {
  risk_level: string;
  confidence: string;
  rules_fired: CheckRuleHit[];
  used_ai: boolean;
  created_at: string;
}

const RULE_LABELS: Record<string, string> = {
  fee_request: "Fee request",
  off_platform_chat: "Off-platform chat",
  free_email: "Free email contact",
  email_website_mismatch: "Email/website mismatch",
  unrealistic_pay: "Unrealistic pay",
  vague_duties: "Vague duties",
  missing_identity: "Missing identity",
  urgency_pressure: "Urgency pressure",
  sensitive_data: "Sensitive data requests",
  suspicious_link: "Suspicious link",
};

const VERDICTS: Record<
  string,
  { label: string; body: string; badgeClass: string; boxClass: string } | undefined
> = {
  high_risk: {
    label: "Warning signs found",
    body: "This post shows strong warning signs. Do not send money, IDs, or codes, and verify the employer independently before applying.",
    badgeClass: "bg-red-100 text-red-800",
    boxClass: "border-red-300 bg-red-50",
  },
  caution: {
    label: "Some warning signs",
    body: "A few things deserve a closer look before you continue. Verify the details below yourself.",
    badgeClass: "bg-amber-100 text-amber-800",
    boxClass: "border-amber-300 bg-amber-50",
  },
  low_signals: {
    label: "No red flags found",
    body: "Nothing in the post text triggered the warning rules. That is not a guarantee — check the employer yourself using the links below.",
    badgeClass: "bg-emerald-100 text-emerald-800",
    boxClass: "border-emerald-300 bg-emerald-50",
  },
};

const SEVERITY_RANK: Record<CheckRuleHit["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function severityBadgeClass(severity: CheckRuleHit["severity"]): string {
  if (severity === "high") return "bg-red-100 text-red-800";
  if (severity === "medium") return "bg-amber-100 text-amber-800";
  return "bg-zinc-100 text-zinc-800";
}

export function ScamCheckPanel({
  check,
  verification,
}: {
  check: ScamCheckView | null;
  verification: VerificationInput;
}) {
  const links = buildVerificationLinks(verification);
  const verdict = check ? VERDICTS[check.risk_level] : undefined;
  const hits = check
    ? [...(check.rules_fired ?? [])].sort(
        (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scam check</CardTitle>
        <CardDescription>
          {check
            ? "Rules-based check of the saved post text."
            : "No scam check recorded for this job yet. Checks run automatically when a post is saved."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {check && verdict ? (
          <div className="flex flex-col gap-4">
            <div className={`rounded-md border p-3 ${verdict.boxClass}`}>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${verdict.badgeClass}`}
              >
                {verdict.label}
              </span>
              <p className="mt-2 text-sm text-zinc-900">{verdict.body}</p>
            </div>

            {hits.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {hits.map((hit, i) => (
                  <li key={`${hit.id}-${i}`} className="rounded-md border border-zinc-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        {RULE_LABELS[hit.id] ?? hit.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(hit.severity)}`}
                      >
                        {hit.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{hit.explanation}</p>
                    {hit.evidence ? (
                      <blockquote className="mt-2 border-l-4 border-zinc-300 pl-3 text-sm italic text-zinc-600">
                        “{hit.evidence}”
                      </blockquote>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {links.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-zinc-500">Verify it yourself</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline"
                      >
                        {link.label}
                      </a>
                      <p className="text-xs text-zinc-600">{link.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-xs text-zinc-500">{LIMITS_STATEMENT}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Until a check is recorded, be cautious: never pay fees to apply and hold back IDs or
            bank details until a contract is signed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
