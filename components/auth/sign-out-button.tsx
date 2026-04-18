"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);

    try {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-xl px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-mid)",
        color: "var(--ink)",
      }}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}