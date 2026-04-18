"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        setError(result.error.message ?? "Sign up failed");
        return;
      }

      const raw = searchParams.get('next') || '/create-universe';
      // Only allow relative paths to prevent open-redirect
      const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/create-universe';
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong during sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
        Create your account
      </h1>
      <p className="mb-8 text-sm" style={{ color: "var(--ghost)" }}>
        Start your GravitySouls journey.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
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
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
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
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm" style={{ color: "var(--ghost)" }}>
        Already have an account?{" "}
        <Link href="/sign-in" className="underline" style={{ color: "var(--star)" }}>
          Sign in
        </Link>
      </p>
    </main>
  );
}