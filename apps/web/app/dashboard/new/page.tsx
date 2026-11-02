import type { Metadata } from "next";
import { JobForm } from "@/components/job-form";

export const metadata: Metadata = {
  title: "Add a job",
};

export default function NewJobPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="mb-2 text-xl font-bold tracking-tight">Add a job</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Paste the job post text below. Only this post is saved — nothing is read in the background.
        A rules-based scam check runs automatically the moment it is saved.
      </p>
      <JobForm />
    </section>
  );
}
