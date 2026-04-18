import { SessionGuard } from "@/components/auth/session-guard";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function DashboardPage() {
  return (
    <SessionGuard>
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
              Dashboard
            </h1>
            <p className="text-sm" style={{ color: "var(--ghost)" }}>
              You are signed in.
            </p>
          </div>
          <SignOutButton />
        </div>

        <section
          className="rounded-2xl p-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-mid)",
          }}
        >
          <h2 className="mb-2 text-xl font-medium" style={{ color: "var(--foreground)" }}>
            Next step
          </h2>
          <p className="text-sm" style={{ color: "var(--ghost)" }}>
            Connect this page to your onboarding, questionnaire, and planet data.
          </p>
        </section>
      </main>
    </SessionGuard>
  );
}