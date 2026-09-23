"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError(tAuth("tooManyRequests"));
        return;
      }
      // Always show the same success state regardless of whether the email
      // exists — never confirm or deny account existence to the caller.
      setSubmitted(true);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
        {tAuth("forgotPasswordTitle")}
      </h1>
      <p className="mb-8 text-sm" style={{ color: "var(--ghost)" }}>
        {tAuth("forgotPasswordSubtitle")}
      </p>

      {submitted ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
          {tAuth("forgotPasswordSent")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
              {tAuth("email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tAuth("emailPlaceholder")}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-mid)",
                color: "var(--foreground)",
              }}
              required
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--nebula), var(--aurora))",
              color: "#fff",
            }}
          >
            {loading ? tCommon("loading") : tAuth("forgotPasswordSubmit")}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm" style={{ color: "var(--ghost)" }}>
        <Link href="/sign-in" className="underline" style={{ color: "var(--star)" }}>
          {tAuth("backToSignIn")}
        </Link>
      </p>
    </main>
  );
}
