"use client";

import { useFormState } from "react-dom";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction] = useFormState<{ error?: string } | null, FormData>(login, null);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-card space-y-6"
    >
      {state?.error && (
        <div className="rounded-lg bg-rose-500/10 text-rose-600 px-4 py-2.5 text-sm">
          {state.error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          로그인 유형
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="relative flex min-h-[4.5rem] cursor-pointer flex-col justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-4 has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand)]/5 transition-colors hover:border-[var(--brand)]/50">
            <input
              type="radio"
              name="role"
              value="em"
              className="sr-only"
              defaultChecked
            />
            <span className="text-sm font-medium">EM</span>
          </label>
          <label className="relative flex min-h-[4.5rem] cursor-pointer flex-col justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-4 has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand)]/5 transition-colors hover:border-[var(--brand)]/50">
            <input type="radio" name="role" value="coach" className="sr-only" />
            <span className="text-sm font-medium">실습코치</span>
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="loginId"
          className="block text-sm font-medium text-[var(--foreground)] mb-2"
        >
          아이디
        </label>
        <input
          id="loginId"
          name="loginId"
          type="text"
          required
          autoComplete="username"
          placeholder="아이디 입력"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--foreground)] mb-2"
        >
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
      >
        로그인
      </button>
    </form>
  );
}
