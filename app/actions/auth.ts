"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateEmLogin, validateCoachLogin } from "@/lib/data";
import type { UserRole } from "@/types";

const COOKIE_NAME = "practice_coach_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function login(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const loginId = (formData.get("loginId") as string)?.trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as UserRole | null;

  if (!loginId || !password || !role) {
    return { error: "로그인 유형, 아이디, 비밀번호를 모두 입력해 주세요." };
  }

  if (role === "em") {
    const user = await validateEmLogin(loginId, password);
    if (!user) return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    const payload = JSON.stringify({
      id: user.id,
      email: user.id,
      name: user.name,
      role: "em",
    });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    redirect("/em");
  }

  const user = await validateCoachLogin(loginId, password);
  if (!user) return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  const payload = JSON.stringify({
    id: user.id,
    email: user.email || user.id,
    name: user.name,
    role: "coach",
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  redirect("/coach");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}

export async function getSession(): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  } catch {
    return null;
  }
}
