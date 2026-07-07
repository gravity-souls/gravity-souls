"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import LegalFooter from "@/components/auth/LegalFooter";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? tAuth("signInFailed"));
        return;
      }

      await fetch("/api/user/language", { cache: "no-store" }).catch(() => null);

      const fromOnboarding = searchParams.get('from') === 'onboarding';
      if (fromOnboarding) {
        const isReady = sessionStorage.getItem('gs_onboarding_ready') === 'true';
        const draftRaw = sessionStorage.getItem('gs_onboarding_draft');
        if (isReady && draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            const res = await fetch('/api/onboarding/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ draft }),
            });
            if (res.ok) {
              sessionStorage.removeItem('gs_onboarding_draft');
              sessionStorage.removeItem('gs_onboarding_step');
              sessionStorage.removeItem('gs_onboarding_ready');
              router.push('/resonance');
              return;
            }
          } catch (e) {
            console.error('Onboarding complete failed:', e);
          }
        }
        // Handoff failed or draft missing — return to onboarding so user can retry.
        // Draft is kept in sessionStorage to preserve calibration progress.
        router.push('/onboarding');
        return;
      }

      router.push("/stream");
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
        {tAuth("signIn")}
      </h1>
      <p className="mb-8 text-sm" style={{ color: "var(--ghost)" }}>
        {tAuth("signInSubtitle")}
      </p>

      <SocialAuthButtons />

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
            {tAuth("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tAuth("passwordPlaceholder")}
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
          {loading ? tCommon("loading") : tAuth("signIn")}
        </button>
      </form>

      <p className="mt-6 text-sm" style={{ color: "var(--ghost)" }}>
        {tAuth("noAccount")}{" "}
        <Link href="/sign-up" className="underline" style={{ color: "var(--star)" }}>
          {tAuth("signUp")}
        </Link>
      </p>
      <div className="mt-4">
        <LegalFooter />
      </div>
    </main>
  );
}
