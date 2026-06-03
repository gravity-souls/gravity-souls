"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

type Props = {
  children: ReactNode;
};

export function SessionGuard({ children }: Props) {
  const router = useRouter();
  const t = useTranslations("common");
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--ghost)" }}>{t("checkingSession")}</p>
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}