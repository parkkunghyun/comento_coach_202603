"use server";

import { google } from "googleapis";

const DEFAULT_CALENDAR_ID =
  "c_434b3261f4e10e2caf2228a9f17b773c88a54e11c52d3ac541d8dd1ad323e01a@group.calendar.google.com";

/**
 * 이벤트 제목 필터. 비어 있으면 해당 캘린더의 모든 이벤트 표시.
 * "기업교육 일정"은 이벤트 제목이 아니라 캘린더 이름/라벨이므로,
 * GOOGLE_CALENDAR_ID로 지정한 캘린더의 모든 일정을 그대로 표시함.
 */
function getSummaryFilter(): string | null {
  const v = process.env.GOOGLE_CALENDAR_SUMMARY_FILTER?.trim();
  return v === "" || v == null ? null : v;
}

function summaryMatchesFilter(summary: string, filter: string): boolean {
  const n = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return n(summary).includes(n(filter));
}

export interface CalendarAttendee {
  displayName?: string;
  email?: string;
}

export interface CalendarSchedule {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "open" | "completed";
  /** 이벤트 설명(메모). HTML일 수 있음 */
  description?: string;
  organizerName?: string;
  organizerEmail?: string;
  /** 참석자 목록 */
  attendees?: CalendarAttendee[];
}

function getCalendarAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  if (!clientEmail || !privateKey) return null;
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
  });
  return auth;
}

function getCalendarAuthWrite() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  if (!clientEmail || !privateKey) return null;
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

function parseEventToSchedule(item: {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  start?: { dateTime?: string | null; date?: string | null };
  end?: { dateTime?: string | null; date?: string | null };
  location?: string | null;
  organizer?: { displayName?: string | null; email?: string | null } | null;
  attendees?: Array<{ displayName?: string | null; email?: string | null }>;
}): CalendarSchedule | null {
  const id = item.id ?? "";
  const title = item.summary?.trim() ?? "(제목 없음)";
  const start = item.start?.dateTime ?? item.start?.date;
  const end = item.end?.dateTime ?? item.end?.date;
  if (!start) return null;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : startDate;
  const dateStr =
    `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const startTime =
    item.start?.dateTime != null
      ? startDate.toTimeString().slice(0, 5)
      : "00:00";
  const endTime =
    item.end?.dateTime != null
      ? endDate.toTimeString().slice(0, 5)
      : "23:59";
  const now = Date.now();
  const status: "open" | "completed" =
    endDate.getTime() < now ? "completed" : "open";

  return {
    id,
    title,
    date: dateStr,
    startTime,
    endTime,
    location: item.location?.trim() ?? "",
    status,
    description: item.description?.trim() || undefined,
    organizerName: item.organizer?.displayName?.trim() || undefined,
    organizerEmail: item.organizer?.email?.trim() || undefined,
    attendees: (item.attendees ?? [])
      .filter((a) => a.email != null && String(a.email).trim() !== "")
      .map((a) => ({
        displayName: a.displayName?.trim() || undefined,
        email: String(a.email ?? "").trim(),
      })),
  };
}

/**
 * 기업교육 캘린더(GOOGLE_CALENDAR_ID)의 일정 조회.
 * 캘린더에 있는 모든 이벤트를 표시(이벤트 제목 필터 없음).
 * attendeeEmail 이 있으면 해당 이메일이 참여자로 포함된 일정만 반환.
 */
export async function getCalendarSchedules(
  attendeeEmail?: string
): Promise<CalendarSchedule[]> {
  try {
    const auth = getCalendarAuth();
    if (!auth) return [];

    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ?? DEFAULT_CALENDAR_ID;
    const calendar = google.calendar({ version: "v3", auth });

    const timeMin = new Date();
    timeMin.setDate(1);
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });

    const items = res.data.items ?? [];
    const summaryFilter = getSummaryFilter();
    let filtered =
      summaryFilter == null
        ? items
        : items.filter((item) =>
            summaryMatchesFilter(item.summary ?? "", summaryFilter)
          );

    if (attendeeEmail) {
      const emailLower = attendeeEmail.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.attendees ?? []).some(
          (a) => a.email?.trim().toLowerCase() === emailLower
        )
      );
    }

    return filtered
      .map((item) => parseEventToSchedule(item))
      .filter((s): s is CalendarSchedule => s != null);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Calendar] getCalendarSchedules error:", err);
    }
    return [];
  }
}

const DEFAULT_TIMEZONE = "Asia/Seoul";

export type CalendarEventPatch = {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  attendees?: { displayName?: string; email: string }[];
};

/**
 * 캘린더 이벤트 수정. 쓰기 권한 필요.
 */
export async function updateCalendarEvent(
  eventId: string,
  patch: CalendarEventPatch
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = getCalendarAuthWrite();
    if (!auth) {
      return { ok: false, error: "캘린더 쓰기 인증 실패" };
    }
    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ?? DEFAULT_CALENDAR_ID;
    const calendar = google.calendar({ version: "v3", auth });

    const body: {
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime: string; timeZone: string };
      end?: { dateTime: string; timeZone: string };
      attendees?: { displayName?: string; email: string }[];
    } = {};

    if (patch.title !== undefined) body.summary = patch.title;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.location !== undefined) body.location = patch.location;
    if (
      patch.date !== undefined &&
      patch.startTime !== undefined &&
      patch.endTime !== undefined
    ) {
      body.start = {
        dateTime: `${patch.date}T${patch.startTime}:00`,
        timeZone: DEFAULT_TIMEZONE,
      };
      body.end = {
        dateTime: `${patch.date}T${patch.endTime}:00`,
        timeZone: DEFAULT_TIMEZONE,
      };
    }
    if (patch.attendees !== undefined) {
      body.attendees = patch.attendees
        .filter((a) => (a.email ?? "").trim() !== "")
        .map((a) => ({
          email: (a.email ?? "").trim(),
          displayName: (a.displayName ?? "").trim() || undefined,
        }));
    }

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: body,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("[Calendar] updateCalendarEvent error:", err);
    }
    return { ok: false, error: message };
  }
}

/**
 * 캘린더 연동 상태 확인 (디버깅/연동 확인용).
 */
export async function getCalendarDebug(attendeeEmail?: string): Promise<{
  ok: boolean;
  error?: string;
  hasAuth: boolean;
  calendarId: string;
  summaryFilter: string;
  totalFromApi: number;
  afterSummaryFilter: number;
  afterAttendeeFilter: number;
  sampleSummaries: string[];
}> {
  const calendarId =
    process.env.GOOGLE_CALENDAR_ID ?? DEFAULT_CALENDAR_ID;
  const summaryFilter = getSummaryFilter();

  const out = {
    ok: false,
    hasAuth: false,
    calendarId,
    summaryFilter: summaryFilter ?? "(전체 표시)",
    totalFromApi: 0,
    afterSummaryFilter: 0,
    afterAttendeeFilter: 0,
    sampleSummaries: [] as string[],
  };

  try {
    const auth = getCalendarAuth();
    if (!auth) {
      return {
        ...out,
        error:
          "캘린더 인증 실패. .env.local에 GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY 가 있는지 확인하세요.",
      };
    }
    out.hasAuth = true;

    const calendar = google.calendar({ version: "v3", auth });
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });

    const items = res.data.items ?? [];
    out.totalFromApi = items.length;
    out.sampleSummaries = items.slice(0, 10).map((i) => i.summary ?? "(제목 없음)");

    let filtered =
      summaryFilter == null
        ? items
        : items.filter((item) =>
            summaryMatchesFilter(item.summary ?? "", summaryFilter)
          );
    out.afterSummaryFilter = filtered.length;

    if (attendeeEmail) {
      const emailLower = attendeeEmail.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.attendees ?? []).some(
          (a) => a.email?.trim().toLowerCase() === emailLower
        )
      );
      out.afterAttendeeFilter = filtered.length;
    } else {
      out.afterAttendeeFilter = filtered.length;
    }

    out.ok = true;
    return out;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...out,
      error: `캘린더 API 오류: ${message}. Google Cloud에서 Calendar API 사용 설정 및 캘린더를 서비스 계정 이메일과 공유했는지 확인하세요.`,
    };
  }
}
