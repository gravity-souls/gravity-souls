"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  // Better Auth's own /api/auth/reset-password/:token callback verifies the
  // token server-side and redirects here — with `?token=...` if valid, or
  // `?error=INVALID_TOKEN` if the link was already used or has expired.
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(tAuth("passwordsDontMatch"));
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setError(result.error.message ?? tAuth("resetPasswordFailed"));
        return;
      }
      setDone(true);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  if (!token || linkError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
          {tAuth("resetPasswordTitle")}
        </h1>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
          {tAuth("resetPasswordLinkInvalid")}
        </p>
        <Link href="/forgot-password" className="text-sm underline" style={{ color: "var(--star)" }}>
          {tAuth("forgotPasswordTitle")}
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
          {tAuth("resetPasswordTitle")}
        </h1>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
          {tAuth("resetPasswordSuccess")}
        </p>
        <Link href="/sign-in" className="text-sm underline" style={{ color: "var(--star)" }}>
          {tAuth("signIn")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
        {tAuth("resetPasswordTitle")}
      </h1>
      <p className="mb-8 text-sm" style={{ color: "var(--ghost)" }}>
        {tAuth("resetPasswordSubtitle")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
            {tAuth("newPassword")}
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-mid)",
              color: "var(--foreground)",
            }}
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
            {tAuth("confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-mid)",
              color: "var(--foreground)",
            }}
            required
            minLength={8}
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
          {loading ? tCommon("loading") : tAuth("resetPasswordSubmit")}
        </button>
      </form>
    </main>
  );
}
