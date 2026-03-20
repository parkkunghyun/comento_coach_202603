import {
  getCalendarSchedules,
  getCoachInfoProfiles,
  getCoachLoginProfiles,
  getExpectedDashboardRows,
} from "@/lib/data";
import { isSheetsEnvConfigured } from "@/lib/sheets-env";
import { ExpectedAssignClient } from "./ExpectedAssignClient";

export default async function EMExpectedAssignPage() {
  const sheetsConnected = isSheetsEnvConfigured();

  const [events, coachInfoProfiles, coachLoginProfiles, dashboardRows] = await Promise.all([
    getCalendarSchedules(),
    getCoachInfoProfiles(),
    getCoachLoginProfiles(),
    getExpectedDashboardRows(),
  ]);

  const baseProfiles =
    (coachInfoProfiles ?? []).length > 0 ? coachInfoProfiles : coachLoginProfiles;

  // 요청사항: 실습코치 정보 시트의 D열(소속)이 '외부'인 사람만
  // (시트 값에 공백이 섞일 수 있어 trim 처리)
  const externalCoaches = (baseProfiles ?? []).filter((p) => {
    const aff = (p.affiliation ?? "").trim();
    return aff === "외부";
  });

  return (
    <ExpectedAssignClient
      sheetsConnected={sheetsConnected}
      dashboardRows={dashboardRows.map((r) => ({
        scheduleSheetId: r.scheduleSheetId,
        companyName: r.companyName,
        coachName: r.coachName,
        courseName: r.courseName,
        educationDate: r.educationDate,
        assignmentStatus: r.assignmentStatus,
      }))}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        location: e.location,
        description: e.description,
      }))}
      coaches={externalCoaches}
    />
  );
}
