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
  ExpectedDashboardRow,
} from "@/types";
import {
  EXPECTED_DASHBOARD_SHEET,
  formatKstYmdHm,
  nextAssignIdForToday,
} from "./expected-dashboard";

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

/** A1 표기용 시트명 (이름에 ' 가 있으면 '' 로 이스케이프) */
function quoteSheetNameForA1(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

/** 탭 이름 비교용 (전각/결합문자/공백 차이 흡수) */
function normalizeSheetTitleKey(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 스프레드시트에 있는 실제 탭 제목 반환 (코드 상수와 다를 수 있음) */
async function resolveExpectedDashboardSheetTitle(
  sheets: NonNullable<Awaited<ReturnType<typeof getSheets>>["sheets"]>,
  spreadsheetId: string
): Promise<string | null> {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const want = normalizeSheetTitleKey(EXPECTED_DASHBOARD_SHEET);
  for (const sh of res.data.sheets ?? []) {
    const t = sh.properties?.title;
    if (t && normalizeSheetTitleKey(t) === want) return t;
  }
  return null;
}

/** 탭이 없으면 `EXPECTED_DASHBOARD_SHEET` 이름으로 생성 */
async function ensureExpectedDashboardSheet(
  sheets: NonNullable<Awaited<ReturnType<typeof getSheets>>["sheets"]>,
  spreadsheetId: string
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  let title = await resolveExpectedDashboardSheetTitle(sheets, spreadsheetId);
  if (title) return { ok: true, title };

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: EXPECTED_DASHBOARD_SHEET,
                gridProperties: { rowCount: 3000, columnCount: 12 },
              },
            },
          },
        ],
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    title = await resolveExpectedDashboardSheetTitle(sheets, spreadsheetId);
    if (title) return { ok: true, title };
    return { ok: false, error: msg };
  }

  title = await resolveExpectedDashboardSheetTitle(sheets, spreadsheetId);
  if (title) return { ok: true, title };
  return { ok: true, title: EXPECTED_DASHBOARD_SHEET };
}

async function expectedDashboardValuesGet(
  sheets: NonNullable<Awaited<ReturnType<typeof getSheets>>["sheets"]>,
  spreadsheetId: string,
  sheetTitle: string,
  a1Suffix: string
): Promise<unknown[][] | null> {
  const quoted = `${quoteSheetNameForA1(sheetTitle)}!${a1Suffix}`;
  const unquoted = `${sheetTitle}!${a1Suffix}`;
  for (const range of [quoted, unquoted]) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return res.data.values ?? null;
    } catch {
      /* try next notation */
    }
  }
  return null;
}

async function expectedDashboardValuesAppendRow(
  sheets: NonNullable<Awaited<ReturnType<typeof getSheets>>["sheets"]>,
  spreadsheetId: string,
  sheetTitle: string,
  row: unknown[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 범위가 넓을수록 일부 환경에서 parse error → 시작 셀만 지정 + INSERT_ROWS
  const attempts = [
    `${quoteSheetNameForA1(sheetTitle)}!A1`,
    `${sheetTitle}!A1`,
    quoteSheetNameForA1(sheetTitle),
  ];
  let last = "append 실패";
  for (const range of attempts) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
      return { ok: true };
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, error: last };
}

async function expectedDashboardValuesUpdateRow(
  sheets: NonNullable<Awaited<ReturnType<typeof getSheets>>["sheets"]>,
  spreadsheetId: string,
  sheetTitle: string,
  rowNum: number,
  row: unknown[]
): Promise<boolean> {
  const cell = `A${rowNum}:I${rowNum}`;
  for (const range of [`${quoteSheetNameForA1(sheetTitle)}!${cell}`, `${sheetTitle}!${cell}`]) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function getValues(sheetName: string, range: string) {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    if (!sheets || !spreadsheetId) return null;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetNameForA1(sheetName)}!${range}`,
    });
    return res.data.values ?? null;
  } catch {
    return null;
  }
}

async function appendValues(sheetName: string, values: unknown[][]) {
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return false;
  try {
    // append API는 '시트'!A:Z 처럼 "열 전체"만 있는 범위를 파싱 못 하는 경우가 많음 → 행 번호 포함
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteSheetNameForA1(sheetName)}!A1:Z10000`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[sheets] appendValues:", err);
    }
    return false;
  }
}

async function updateValues(sheetName: string, range: string, values: unknown[][]) {
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return false;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetNameForA1(sheetName)}!${range}`,
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

// --- 실습코치정보 (외부/내부 분류용)
// 요청사항 기준 컬럼 예시: No.(A), 상태(B), 이름(C), 소속(D=내부/외부), 월평균 출강수(E), 이메일(F)
export async function getCoachInfoProfiles(): Promise<CoachLoginProfile[]> {
  const rows = await getValues("실습코치정보", "A2:F500");
  if (!rows?.length) return [];

  return rows.map((r, i) => {
    const emailFromF = String(r[5] ?? "").trim();
    const emailFromE = String(r[4] ?? "").trim();
    const email =
      emailFromF.includes("@")
        ? emailFromF
        : emailFromE.includes("@")
          ? emailFromE
          : emailFromF || emailFromE;

    return {
      rowIndex: i + 2,
      no: String(r[0] ?? ""),
      status: String(r[1] ?? "").trim(),
      name: String(r[2] ?? ""),
      affiliation: String(r[3] ?? "").trim(),
      email,
      contact: "",
      birthDate: "",
      address: "",
    };
  });
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

// --- 실습코치_예상대시보드 (A~I)
// 배정ID, 일정ID, 교육일자, 기업명, 과정명, 실습코치명, 배정상태, 비고, 최종수정일시
export async function getExpectedDashboardRows(): Promise<ExpectedDashboardRow[]> {
  const { sheets, spreadsheetId } = await getSheets();
  if (!sheets || !spreadsheetId) return [];
  const ensured = await ensureExpectedDashboardSheet(sheets, spreadsheetId);
  if (!ensured.ok) return [];
  const rows = await expectedDashboardValuesGet(
    sheets,
    spreadsheetId,
    ensured.title,
    "A2:I2000"
  );
  if (!rows?.length) return [];
  return rows
    .filter((r) => String(r[0] ?? "").trim() !== "")
    .map((r) => ({
      assignId: String(r[0] ?? ""),
      scheduleSheetId: String(r[1] ?? ""),
      educationDate: String(r[2] ?? ""),
      companyName: String(r[3] ?? ""),
      courseName: String(r[4] ?? ""),
      coachName: String(r[5] ?? ""),
      assignmentStatus: String(r[6] ?? ""),
      notes: String(r[7] ?? ""),
      updatedAt: String(r[8] ?? ""),
    }));
}

export async function upsertExpectedDashboardRow(data: {
  scheduleSheetId: string;
  educationDate: string;
  companyName: string;
  courseName: string;
  coachName: string;
  assignmentStatus: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string; assignId?: string }> {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    if (!sheets || !spreadsheetId) {
      return { ok: false, error: "스프레드시트 연동이 설정되지 않았습니다." };
    }

    const ensured = await ensureExpectedDashboardSheet(sheets, spreadsheetId);
    if (!ensured.ok) {
      return {
        ok: false,
        error: `예상대시보드 시트를 찾거나 만들 수 없습니다: ${ensured.error}`,
      };
    }
    const sheetTitle = ensured.title;

    const now = formatKstYmdHm();
    const status =
      String(data.assignmentStatus).trim() === "확정배정" ? "확정배정" : "예상배정";
    const rows = await expectedDashboardValuesGet(
      sheets,
      spreadsheetId,
      sheetTitle,
      "A2:I2000"
    );
    const dataRows = rows?.filter((r) => String(r[0] ?? "").trim() !== "") ?? [];
    const target = data.scheduleSheetId.trim();
    const idx = dataRows.findIndex((r) => String(r[1] ?? "").trim() === target);

    const buildRow = (assignId: string) => [
      assignId,
      data.scheduleSheetId,
      data.educationDate,
      data.companyName,
      data.courseName,
      data.coachName,
      status,
      data.notes,
      now,
    ];

    if (idx >= 0) {
      const assignId = String(dataRows[idx][0] ?? "");
      const rowNum = idx + 2;
      const ok = await expectedDashboardValuesUpdateRow(
        sheets,
        spreadsheetId,
        sheetTitle,
        rowNum,
        buildRow(assignId)
      );
      return ok ? { ok: true, assignId } : { ok: false, error: "시트 업데이트에 실패했습니다." };
    }

    const colA = dataRows.map((r) => String(r[0] ?? ""));
    const newId = nextAssignIdForToday(colA);
    const appended = await expectedDashboardValuesAppendRow(
      sheets,
      spreadsheetId,
      sheetTitle,
      buildRow(newId)
    );
    if (!appended.ok) {
      return { ok: false, error: appended.error };
    }
    return { ok: true, assignId: newId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
