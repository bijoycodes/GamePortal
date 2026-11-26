"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField, describedBy } from "@/components/FormField";
import { browserFetch, getErrorMessage } from "@/lib/api";
import type { AdminUser } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await browserFetch<{ user: AdminUser }>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      router.push("/admin");
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="panel space-y-4 p-6">
      <ApiErrorBanner message={error} />
      <FormField id="login-email" label="Email address" required>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <FormField id="login-password" label="Password" required>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          className="input"
          value={password}
          aria-describedby={describedBy("login-password", error ?? undefined)}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="muted text-center text-xs">
        Admin access is limited to accounts with the administrator role.
      </p>
    </form>
  );
}
