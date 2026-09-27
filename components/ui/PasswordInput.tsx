"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);
  const tA11y = useTranslations("a11y");

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-mid)",
          color: "var(--foreground)",
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? tA11y("hidePassword") : tA11y("showPassword")}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-60 transition-opacity hover:opacity-100"
        style={{ color: "var(--ghost)", background: "none", border: "none", cursor: "pointer" }}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
