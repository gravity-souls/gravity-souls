"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);

    try {
      await authClient.signOut();
      window.location.href = "/sign-in";
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
      {loading ? tCommon("signingOut") : tNav("signOut")}
    </button>
  );
}