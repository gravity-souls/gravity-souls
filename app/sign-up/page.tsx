"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import PlanetPicker from "@/components/planet/PlanetPicker";
import { PRESET_PLANETS, type PlanetConfig } from "@/types/planet";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import LegalFooter from "@/components/auth/LegalFooter";

// Phase 1: planet visual is determined during /onboarding — re-enable once onboarding-complete API is wired
const PLANET_PICKER_ENABLED = false

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetConfig>(PRESET_PLANETS[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? tAuth("signUpFailed"));
        return;
      }

      try {
        await fetch("/api/user/language", { cache: "no-store" });
        await fetch("/api/user/planet-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseTexture: selectedPlanet.baseTexture,
            tintColor: selectedPlanet.tintColor,
            atmosphereColor: selectedPlanet.atmosphereColor,
            hasRing: selectedPlanet.hasRing,
            ringColor: selectedPlanet.ringColor,
          }),
        });
      } catch (e) {
        console.error("Failed to save planet texture config:", e);
      }

      const raw = searchParams.get('next') || '/onboarding';
      // Only allow relative paths to prevent open-redirect
      const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/onboarding';
      router.push(next);
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
        {tAuth("signUp")}
      </h1>
      <p className="mb-8 text-sm" style={{ color: "var(--ghost)" }}>
        {tAuth("signUpSubtitle")}
      </p>

      <SocialAuthButtons />

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
            {tAuth("name")}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tAuth("namePlaceholder")}
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
            placeholder={tAuth("passwordMinPlaceholder")}
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

        {PLANET_PICKER_ENABLED && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                {tAuth("planetTexture")}
              </span>
            </div>
            <PlanetPicker selectedPlanet={selectedPlanet} onSelect={setSelectedPlanet} />
          </div>
        )}

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
          {loading ? tCommon("loading") : tAuth("signUp")}
        </button>
      </form>

      <p className="mt-6 text-sm" style={{ color: "var(--ghost)" }}>
        {tAuth("hasAccount")}{" "}
        <Link href="/sign-in" className="underline" style={{ color: "var(--star)" }}>
          {tAuth("signIn")}
        </Link>
      </p>
      <div className="mt-4">
        <LegalFooter />
      </div>
    </main>
  );
}