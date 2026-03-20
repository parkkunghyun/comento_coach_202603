"use server";

import * as sheets from "./sheets";
import * as calendar from "./calendar";
import {
  mockUsers,
  mockSchedules,
  mockCoachProfiles,
  mockAssignments,
  mockReviews,
  mockAutoAssignRules,
  mockExpectedDashboardRows,
} from "./mock-data";
import { formatKstYmdHm, nextAssignIdForToday } from "./expected-dashboard";
import { isSheetsEnvConfigured } from "./sheets-env";
import type { ExpectedDashboardRow } from "@/types";

export type { CalendarSchedule } from "./calendar";

/**
 * 스프레드시트 사용 여부는 **호출 시마다** env를 읽습니다.
 * 모듈 최상단에서 한 번만 읽으면, dev 서버 기동 후 .env를 채워도
 * 영원히 mock 경로만 타는 버그가 납니다.
 */
function isSheetsEnabled(): boolean {
  return isSheetsEnvConfigured();
}

export async function getUsers() {
  if (isSheetsEnabled()) return sheets.getUsers();
  return mockUsers;
}

export async function findUserByEmail(email: string) {
  if (isSheetsEnabled()) return sheets.findUserByEmail(email);
  return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function validateEmLogin(
  id: string,
  password: string
): Promise<{ id: string; name: string } | null> {
  if (isSheetsEnabled()) return sheets.validateEmLogin(id, password);
  if (id.trim() === "em" && password === "em") return { id: "em", name: "교육운영 매니저" };
  return null;
}

export async function validateCoachLogin(
  id: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  if (isSheetsEnabled()) return sheets.validateCoachLogin(id, password);
  if (id.trim() === "coach1" && password === "coach1")
    return { id: "c1", name: "김실습", email: "coach1@example.com" };
  if (id.trim() === "coach2" && password === "coach2")
    return { id: "c2", name: "이코치", email: "coach2@example.com" };
  return null;
}

export async function getSchedules() {
  if (isSheetsEnabled()) return sheets.getSchedules();
  return mockSchedules;
}

export async function getScheduleById(id: string) {
  if (isSheetsEnabled()) return sheets.getScheduleById(id);
  return mockSchedules.find((s) => s.id === id) ?? null;
}

/** Google Calendar 기업교육 일정. 실습코치는 attendeeEmail 전달 시 본인이 참여자인 일정만 조회 */
export async function getCalendarSchedules(attendeeEmail?: string) {
  return calendar.getCalendarSchedules(attendeeEmail);
}

/** 캘린더 연동 상태 확인 (디버깅용) */
export async function getCalendarDebug(attendeeEmail?: string) {
  return calendar.getCalendarDebug(attendeeEmail);
}

/** 캘린더 이벤트 수정 */
export async function updateCalendarEvent(
  eventId: string,
  patch: import("./calendar").CalendarEventPatch
) {
  return calendar.updateCalendarEvent(eventId, patch);
}

export async function getCoachProfiles() {
  if (isSheetsEnabled()) return sheets.getCoachProfiles();
  return mockCoachProfiles;
}

export async function getCoachProfileByUserId(userId: string) {
  if (isSheetsEnabled()) return sheets.getCoachProfileByUserId(userId);
  return mockCoachProfiles.find((p) => p.userId === userId) ?? null;
}

/** 실습코치 로그인 시트에서 프로필 목록 (No., 상태, 이름, 소속, 이메일 등) */
export async function getCoachLoginProfiles() {
  if (isSheetsEnabled()) return sheets.getCoachLoginProfiles();
  return [];
}

export async function getCoachInfoProfiles() {
  if (isSheetsEnabled()) return sheets.getCoachInfoProfiles();
  return [];
}

/** 실습코치 로그인 시트 지정 행 수정 */
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
) {
  if (isSheetsEnabled()) return sheets.updateCoachLoginProfile(rowIndex, updates);
  return false;
}

export async function getAssignments() {
  if (isSheetsEnabled()) return sheets.getAssignments();
  return mockAssignments;
}

export async function getAssignmentsByCoachId(coachId: string) {
  if (isSheetsEnabled()) return sheets.getAssignmentsByCoachId(coachId);
  return mockAssignments.filter((a) => a.coachId === coachId);
}

export async function getAssignmentsByScheduleId(scheduleId: string) {
  if (isSheetsEnabled()) return sheets.getAssignmentsByScheduleId(scheduleId);
  return mockAssignments.filter((a) => a.scheduleId === scheduleId);
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: "pending" | "accepted" | "rejected" | "confirmed"
) {
  if (isSheetsEnabled()) return sheets.updateAssignmentStatus(assignmentId, status);
  const a = mockAssignments.find((x) => x.id === assignmentId);
  if (a) {
    a.status = status;
    if (status === "accepted" || status === "rejected") a.respondedAt = new Date().toISOString();
    if (status === "confirmed") a.confirmedAt = new Date().toISOString();
  }
  return !!a;
}

export async function confirmAssignment(assignmentId: string) {
  if (isSheetsEnabled()) return sheets.confirmAssignment(assignmentId);
  return updateAssignmentStatus(assignmentId, "confirmed");
}

/** 배정 한 건 생성 (캘린더 scheduleId 사용 가능) */
export async function createAssignment(data: {
  scheduleId: string;
  coachId: string;
  coachName: string;
  status?: "pending" | "accepted" | "rejected" | "confirmed";
}): Promise<string | null> {
  if (isSheetsEnabled()) return sheets.createAssignment(data);
  return null;
}

/** 배정의 실습코치 변경 (재배정) */
export async function updateAssignmentCoach(
  assignmentId: string,
  coachId: string,
  coachName: string
): Promise<boolean> {
  if (isSheetsEnabled()) return sheets.updateAssignmentCoach(assignmentId, coachId, coachName);
  return false;
}

export async function getReviews() {
  if (isSheetsEnabled()) return sheets.getReviews();
  return mockReviews;
}

export async function createReview(data: {
  assignmentId: string;
  scheduleId: string;
  coachId: string;
  content: string;
  issues: string;
  rating: number;
}) {
  if (isSheetsEnabled()) return sheets.createReview(data);
  mockReviews.push({
    id: `rev_${Date.now()}`,
    ...data,
    submittedAt: new Date().toISOString(),
  });
  return true;
}

export async function getAutoAssignRules() {
  if (isSheetsEnabled()) return sheets.getAutoAssignRules();
  return mockAutoAssignRules;
}

export async function updateCoachProfileLevel(profileId: string, level: number) {
  if (isSheetsEnabled()) return sheets.updateCoachProfileLevel(profileId, level);
  const p = mockCoachProfiles.find((x) => x.id === profileId);
  if (p) p.level = level;
  return !!p;
}

/** 실습코치 등급 시트 데이터 (인원들 LEVEL 현황) */
export async function getCoachLevelStatus() {
  if (isSheetsEnabled()) return sheets.getCoachLevelStatus();
  return [];
}

/** 실습코치_예상대시보드 시트 (가배정/예상배정) */
export async function getExpectedDashboardRows(): Promise<ExpectedDashboardRow[]> {
  if (isSheetsEnabled()) return sheets.getExpectedDashboardRows();
  return mockExpectedDashboardRows.map((r) => ({ ...r }));
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
  if (isSheetsEnabled()) return sheets.upsertExpectedDashboardRow(data);
  const now = formatKstYmdHm();
  const status =
    String(data.assignmentStatus).trim() === "확정배정" ? "확정배정" : "예상배정";
  const target = data.scheduleSheetId.trim();
  const idx = mockExpectedDashboardRows.findIndex((r) => r.scheduleSheetId === target);
  if (idx >= 0) {
    const prev = mockExpectedDashboardRows[idx]!;
    mockExpectedDashboardRows[idx] = {
      ...prev,
      educationDate: data.educationDate,
      companyName: data.companyName,
      courseName: data.courseName,
      coachName: data.coachName,
      assignmentStatus: status,
      notes: data.notes,
      updatedAt: now,
    };
    return { ok: true, assignId: prev.assignId };
  }
  const newId = nextAssignIdForToday(mockExpectedDashboardRows.map((r) => r.assignId));
  mockExpectedDashboardRows.push({
    assignId: newId,
    scheduleSheetId: data.scheduleSheetId,
    educationDate: data.educationDate,
    companyName: data.companyName,
    courseName: data.courseName,
    coachName: data.coachName,
    assignmentStatus: status,
    notes: data.notes,
    updatedAt: now,
  });
  return { ok: true, assignId: newId };
}

/** 실습코치 등급 시트 E,F,G(생성형AI/Python/핸즈온 가능) 수정 */
export async function updateCoachLevelAvailability(
  email: string,
  updates: { genAiAvailable?: boolean; pythonAvailable?: boolean; handsonAvailable?: boolean }
) {
  if (isSheetsEnabled()) return sheets.updateCoachLevelAvailability(email, updates);
  return false;
}
