"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_DESCRIPTION_LENGTH } from "@jobsafe/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FieldState {
  title: string;
  company_name: string;
  location: string;
  work_type: string;
  salary_text: string;
  source_url: string;
  contact_text: string;
  description: string;
}

const INITIAL: FieldState = {
  title: "",
  company_name: "",
  location: "",
  work_type: "full-time",
  salary_text: "",
  source_url: "",
  contact_text: "",
  description: "",
};

const WORK_TYPES = ["full-time", "part-time", "contract", "internship", "freelance", "other"];

/** "Add job manually / paste post" form — becomes the paste feature. */
export function JobForm() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const described = fields.description.trim().length;

  function setField(name: keyof FieldState) {
    return (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      setFields((prev) => ({ ...prev, [name]: event.target.value }));
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_platform: "manual",
          title: fields.title,
          company_name: fields.company_name,
          location: fields.location,
          work_type: fields.work_type,
          salary_text: fields.salary_text,
          source_url: fields.source_url,
          contact_text: fields.contact_text,
          description: fields.description,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        job?: { id: string };
        error?: string;
        details?: { message: string }[];
      } | null;

      if (res.ok && data?.job?.id) {
        router.push(`/dashboard/jobs/${data.job.id}`);
        router.refresh();
        return;
      }
      const detail = data?.details?.map((d) => d.message).join("; ");
      setError(detail || data?.error || "Could not save the job. Please try again.");
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="title">Job title</Label>
            <Input
              id="title"
              value={fields.title}
              onChange={setField("title")}
              placeholder="e.g. Customer Service Representative"
              maxLength={200}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="company_name">Company / poster name</Label>
            <Input
              id="company_name"
              value={fields.company_name}
              onChange={setField("company_name")}
              placeholder="e.g. ACME Recruitment"
              maxLength={200}
              className="mt-1"
            />
          </div>

          <div className="gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={fields.location}
                onChange={setField("location")}
                placeholder="e.g. Quezon City / WFH"
                maxLength={200}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="work_type">Work type</Label>
              <Select
                id="work_type"
                value={fields.work_type}
                onChange={setField("work_type")}
                className="mt-1"
              >
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="salary_text">Salary as written</Label>
            <Input
              id="salary_text"
              value={fields.salary_text}
              onChange={setField("salary_text")}
              placeholder="e.g. PHP 25,000 - 45,000 monthly"
              maxLength={200}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="source_url">Link to the post (optional)</Label>
            <Input
              id="source_url"
              value={fields.source_url}
              onChange={setField("source_url")}
              type="url"
              inputMode="url"
              placeholder="https://…"
              maxLength={2000}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contact_text">Contact details found in the post (optional)</Label>
            <Input
              id="contact_text"
              value={fields.contact_text}
              onChange={setField("contact_text")}
              placeholder="emails, phone numbers, chat handles"
              maxLength={4000}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="description">Job post text (required)</Label>
              <span className="text-xs tabular-nums text-zinc-500">
                {described.toLocaleString()} / {MAX_DESCRIPTION_LENGTH.toLocaleString()}
              </span>
            </div>
            <Textarea
              id="description"
              value={fields.description}
              onChange={setField("description")}
              required
              rows={10}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Paste the complete job post here — including any pay claims, requirements, and how to apply."
              aria-describedby="description-hint"
              className="mt-1"
            />
            <p id="description-hint" className="mt-1 text-xs text-zinc-500">
              Paste everything; scam checks work best with the complete text.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={busy || described === 0}>
              {busy ? "Saving…" : "Save job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
