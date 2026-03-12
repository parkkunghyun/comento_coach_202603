"use server";

import { google } from "googleapis";
import type {
  User,
  Schedule,
  CoachProfile,
  CoachLoginProfile,
  Assignment,
  AssignmentStatus,
  Review,
  AutoAssignRule,
  CoachLevelRow,
} from "@/types";

const getSheets = async () => {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return { sheets: null, spreadsheetId: null };
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, spreadsheetId };
};

async function getValues(sheetName: string, range: string) {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    if (!sheets || !spreadsheetId) return null;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!${range}`,
    });
    return res.data.values ?? null;
  } catch {
    return null;
  }
}

async function appendValues(sheetName: string, values: unknown[][]) {
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return false;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return true;
}

async function updateValues(sheetName: string, range: string, values: unknown[][]) {
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return false;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!${range}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return true;
}

// --- Users (id, email, name, role, createdAt)
export async function getUsers(): Promise<User[]> {
  const rows = await getValues("users", "A2:E1000");
  if (!rows?.length) return [];
  return rows.map((r) => ({
    id: String(r[0] ?? ""),
    email: String(r[1] ?? ""),
    name: String(r[2] ?? ""),
    role: (r[3] === "coach" ? "coach" : "em") as User["role"],
    createdAt: String(r[4] ?? ""),
  }));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

// --- EM 로그인 (시트 "EM 로그인": C열=아이디, D열=비밀번호)
export async function validateEmLogin(
  id: string,
  password: string
): Promise<{ id: string; name: string } | null> {
  try {
    const rows = await getValues("EM 로그인", "C2:D500");
    if (!rows?.length) return null;
    const trimmedId = id.trim();
    const matched = rows.find(
      (r) => String(r[0] ?? "").trim() === trimmedId && String(r[1] ?? "").trim() === password
    );
    if (!matched) return null;
    return {
      id: String(matched[0] ?? "").trim(),
      name: "교육운영 매니저",
    };
  } catch {
    return null;
  }
}

// --- 실습코치 로그인 시트 프로필 목록 (A=No., B=상태, C=이름, D=소속, E=이메일, F=연락처, G=생년월일, H=거주지)
export async function getCoachLoginProfiles(): Promise<CoachLoginProfile[]> {
  const rows = await getValues("실습코치 로그인", "A2:H500");
  if (!rows?.length) return [];
  return rows.map((r, i) => ({
    rowIndex: i + 2, // 시트 1-based 행 (헤더=1, 데이터=2~)
    no: String(r[0] ?? ""),
    status: String(r[1] ?? "").trim(),
    name: String(r[2] ?? ""),
    affiliation: String(r[3] ?? "").trim(),
    email: String(r[4] ?? ""),
    contact: String(r[5] ?? ""),
    birthDate: String(r[6] ?? ""),
    address: String(r[7] ?? ""),
  }));
}

/** 실습코치 로그인 시트 지정 행 수정 (B~H열) */
export async function updateCoachLoginProfile(
  rowIndex: number,
  updates: {
    status?: string;
    name?: string;
    affiliation?: string;
    email?: string;
    contact?: string;
    birthDate?: string;
    address?: string;
  }
): Promise<boolean> {
  const rows = await getValues("실습코치 로그인", `A${rowIndex}:H${rowIndex}`);
  if (!rows?.length || rowIndex < 2) return false;
  const row = rows[0];
  const status = updates.status ?? String(row[1] ?? "").trim();
  const name = updates.name ?? String(row[2] ?? "").trim();
  const affiliation = updates.affiliation ?? String(row[3] ?? "").trim();
  const email = updates.email ?? String(row[4] ?? "").trim();
  const contact = updates.contact ?? String(row[5] ?? "").trim();
  const birthDate = updates.birthDate ?? String(row[6] ?? "").trim();
  const address = updates.address ?? String(row[7] ?? "").trim();
  const range = `B${rowIndex}:H${rowIndex}`;
  return updateValues("실습코치 로그인", range, [
    [status, name, affiliation, email, contact, birthDate, address],
  ]);
}

// --- 실습코치 로그인 (시트 "실습코치 로그인": F열=이메일, G열=아이디, H열=비밀번호)
export async function validateCoachLogin(
  id: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const rows = await getValues("실습코치 로그인", "F2:H500");
    if (!rows?.length) return null;
    const trimmedId = id.trim();
    const matched = rows.find(
      (r) => String(r[1] ?? "").trim() === trimmedId && String(r[2] ?? "").trim() === password
    );
    if (!matched) return null;
    return {
      id: String(matched[1] ?? "").trim(),
      name: "실습코치",
      email: String(matched[0] ?? "").trim(),
    };
  } catch {
    return null;
  }
}

// --- Schedules
export async function getSchedules(): Promise<Schedule[]> {
  const rows = await getValues("schedules", "A2:J1000");
  if (!rows?.length) return [];
  const statuses: Schedule["status"][] = ["draft", "open", "closed", "completed"];
  return rows.map((r) => {
    const rawStatus = String(r[7] ?? "");
    const status = statuses.includes(rawStatus as Schedule["status"])
      ? (rawStatus as Schedule["status"])
      : "draft";
    return {
      id: String(r[0] ?? ""),
      title: String(r[1] ?? ""),
      date: String(r[2] ?? ""),
      startTime: String(r[3] ?? ""),
      endTime: String(r[4] ?? ""),
      location: String(r[5] ?? ""),
      capacity: Number(r[6]) || 0,
      status,
      createdAt: String(r[8] ?? ""),
    };
  });
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const list = await getSchedules();
  return list.find((s) => s.id === id) ?? null;
}

// --- Coach profiles
export async function getCoachProfiles(): Promise<CoachProfile[]> {
  const rows = await getValues("coach_profiles", "A2:J1000");
  if (!rows?.length) return [];
  return rows.map((r) => ({
    id: String(r[0] ?? ""),
    userId: String(r[1] ?? ""),
    name: String(r[2] ?? ""),
    level: Number(r[3]) || 1,
    specialty: String(r[4] ?? ""),
    bio: String(r[5] ?? ""),
    totalSessions: Number(r[6]) || 0,
    rating: Number(r[7]) || 0,
    updatedAt: String(r[8] ?? ""),
  }));
}

export async function getCoachProfileByUserId(userId: string): Promise<CoachProfile | null> {
  const list = await getCoachProfiles();
  return list.find((p) => p.userId === userId) ?? null;
}

// --- Assignments
export async function getAssignments(): Promise<Assignment[]> {
  const rows = await getValues("assignments", "A2:J1000");
  if (!rows?.length) return [];
  return rows.map((r) => ({
    id: String(r[0] ?? ""),
    scheduleId: String(r[1] ?? ""),
    coachId: String(r[2] ?? ""),
    coachName: r[3] ? String(r[3]) : undefined,
    status: (["pending", "accepted", "rejected", "confirmed"].includes(String(r[4])))
      ? (r[4] as AssignmentStatus)
      : "pending",
    recommendedScore: r[5] !== undefined && r[5] !== "" ? Number(r[5]) : undefined,
    assignedAt: String(r[6] ?? ""),
    respondedAt: r[7] ? String(r[7]) : undefined,
    confirmedAt: r[8] ? String(r[8]) : undefined,
  }));
}

export async function getAssignmentsByCoachId(coachId: string): Promise<Assignment[]> {
  const list = await getAssignments();
  return list.filter((a) => a.coachId === coachId);
}

export async function getAssignmentsByScheduleId(scheduleId: string): Promise<Assignment[]> {
  const list = await getAssignments();
  return list.filter((a) => a.scheduleId === scheduleId);
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: Assignment["status"]
): Promise<boolean> {
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return false;
  const rows = await getValues("assignments", "A2:J1000");
  if (!rows?.length) return false;
  const rowIndex = rows.findIndex((r) => String(r[0]) === assignmentId);
  if (rowIndex < 0) return false;
  // assignments: A=id, B=scheduleId, C=coachId, D=coachName, E=status
  const range = `E${rowIndex + 2}`;
  await updateValues("assignments", range, [[status]]);
  return true;
}

export async function confirmAssignment(assignmentId: string): Promise<boolean> {
  return updateAssignmentStatus(assignmentId, "confirmed");
}

/** 배정 한 건 추가 (A=id, B=scheduleId, C=coachId, D=coachName, E=status, F=recommendedScore, G=assignedAt) */
export async function createAssignment(data: {
  scheduleId: string;
  coachId: string;
  coachName: string;
  status?: AssignmentStatus;
}): Promise<string | null> {
  const id = `assign_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const ok = await appendValues("assignments", [
    [
      id,
      data.scheduleId,
      data.coachId,
      data.coachName,
      data.status ?? "pending",
      "",
      new Date().toISOString(),
      "",
      "",
    ],
  ]);
  return ok ? id : null;
}

/** 배정의 실습코치 변경 (재배정) */
export async function updateAssignmentCoach(
  assignmentId: string,
  coachId: string,
  coachName: string
): Promise<boolean> {
  const rows = await getValues("assignments", "A2:J1000");
  if (!rows?.length) return false;
  const rowIndex = rows.findIndex((r) => String(r[0]) === assignmentId);
  if (rowIndex < 0) return false;
  const range = `C${rowIndex + 2}:D${rowIndex + 2}`;
  return updateValues("assignments", range, [[coachId, coachName]]);
}

// --- Reviews
export async function getReviews(): Promise<Review[]> {
  const rows = await getValues("reviews", "A2:J1000");
  if (!rows?.length) return [];
  return rows.map((r) => ({
    id: String(r[0] ?? ""),
    assignmentId: String(r[1] ?? ""),
    scheduleId: String(r[2] ?? ""),
    coachId: String(r[3] ?? ""),
    content: String(r[4] ?? ""),
    issues: String(r[5] ?? ""),
    rating: Number(r[6]) || 0,
    submittedAt: String(r[7] ?? ""),
  }));
}

export async function createReview(data: {
  assignmentId: string;
  scheduleId: string;
  coachId: string;
  content: string;
  issues: string;
  rating: number;
}): Promise<boolean> {
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return appendValues("reviews", [
    [
      id,
      data.assignmentId,
      data.scheduleId,
      data.coachId,
      data.content,
      data.issues,
      data.rating,
      new Date().toISOString(),
    ],
  ]);
}

// --- Auto assign rules
export async function getAutoAssignRules(): Promise<AutoAssignRule[]> {
  const rows = await getValues("auto_assign_rules", "A2:K100");
  if (!rows?.length) return [];
  return rows.map((r) => ({
    id: String(r[0] ?? ""),
    name: String(r[1] ?? ""),
    enabled: String(r[2]) === "TRUE" || r[2] === "1",
    priority: Number(r[3]) || 0,
    conditions: String(r[4] ?? ""),
    weightLevel: Number(r[5]) || 1,
    weightSpecialty: Number(r[6]) || 1,
    weightRating: Number(r[7]) || 1,
    weightAvailability: Number(r[8]) || 1,
    updatedAt: String(r[9] ?? ""),
  }));
}

export async function updateCoachProfileLevel(
  profileId: string,
  level: number
): Promise<boolean> {
  const rows = await getValues("coach_profiles", "A2:J1000");
  if (!rows?.length) return false;
  const rowIndex = rows.findIndex((r) => String(r[0]) === profileId);
  if (rowIndex < 0) return false;
  await updateValues("coach_profiles", `D${rowIndex + 2}`, [[level]]);
  return true;
}

// --- 실습코치 등급 (시트 "실습코치 등급": A~T열)
// A=이메일, B=이름, C=상태, D=소속, E=보고서 가능, F=Python가능, G=핸즈온가능,
// H=핸즈온검증, I~M=..., N=지방가능여부, ..., T=LEVEL
export async function getCoachLevelStatus(): Promise<CoachLevelRow[]> {
  const rows = await getValues("실습코치 등급", "A2:T500");
  if (!rows?.length) return [];
  return rows.map((r) => ({
    email: String(r[0] ?? ""),
    name: String(r[1] ?? ""),
    status: String(r[2] ?? ""),
    affiliation: String(r[3] ?? ""),
    genAiAvailable: String(r[4] ?? ""),
    pythonAvailable: String(r[5] ?? ""),
    handsonAvailable: String(r[6] ?? ""),
    handsonVerified: String(r[7] ?? ""),
    handsonCount6m: String(r[8] ?? ""),
    avgSatisfaction: String(r[9] ?? ""),
    assignCount30d: String(r[10] ?? ""),
    participationRestrict: String(r[11] ?? ""),
    weeklyCapacity: String(r[12] ?? ""),
    regionalAvailable: String(r[13] ?? ""),
    modifiedAt: String(r[14] ?? ""),
    modifiedBy: String(r[15] ?? ""),
    modifyReason: String(r[16] ?? ""),
    contact: String(r[17] ?? ""),
    birthDate: String(r[18] ?? ""),
    level: String(r[19] ?? ""),
  }));
}

function computeLevel(genAi: boolean, python: boolean, handson: boolean): string {
  if (genAi && python && handson) return "LEVEL3";
  if (genAi && python) return "LEVEL2";
  if (genAi) return "LEVEL1";
  return "";
}

/** 실습코치 등급 시트에서 이메일(A열)로 행 찾아 E,F,G 수정 후 T열(LEVEL) 자동 반영 */
export async function updateCoachLevelAvailability(
  email: string,
  updates: { genAiAvailable?: boolean; pythonAvailable?: boolean; handsonAvailable?: boolean }
): Promise<boolean> {
  const rows = await getValues("실습코치 등급", "A2:T500");
  if (!rows?.length) return false;
  const emailTrim = email.trim().toLowerCase();
  const rowIndex = rows.findIndex((r) => String(r[0] ?? "").trim().toLowerCase() === emailTrim);
  if (rowIndex < 0) return false;
  const baseRow = rowIndex + 2;
  const row = rows[rowIndex];
  let genAi = toBool(String(row[4] ?? ""));
  let python = toBool(String(row[5] ?? ""));
  let handson = toBool(String(row[6] ?? ""));
  if (updates.genAiAvailable !== undefined) genAi = updates.genAiAvailable;
  if (updates.pythonAvailable !== undefined) python = updates.pythonAvailable;
  if (updates.handsonAvailable !== undefined) handson = updates.handsonAvailable;
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return false;
  if (updates.genAiAvailable !== undefined) {
    await updateValues("실습코치 등급", `E${baseRow}`, [[genAi ? "TRUE" : "FALSE"]]);
  }
  if (updates.pythonAvailable !== undefined) {
    await updateValues("실습코치 등급", `F${baseRow}`, [[python ? "TRUE" : "FALSE"]]);
  }
  if (updates.handsonAvailable !== undefined) {
    await updateValues("실습코치 등급", `G${baseRow}`, [[handson ? "TRUE" : "FALSE"]]);
  }
  const level = computeLevel(genAi, python, handson);
  await updateValues("실습코치 등급", `T${baseRow}`, [[level]]);
  return true;
}

function toBool(val: string): boolean {
  const v = String(val).toUpperCase();
  return v === "TRUE" || v === "1";
}
