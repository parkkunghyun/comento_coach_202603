import type {
  User,
  Schedule,
  CoachProfile,
  Assignment,
  Review,
  AutoAssignRule,
  ExpectedDashboardRow,
} from "@/types";

/** 시트 미연동 시 예상대시보드 인메모리 저장 (개발용) */
export let mockExpectedDashboardRows: ExpectedDashboardRow[] = [];

export const mockUsers: User[] = [
  {
    id: "em1",
    email: "em@example.com",
    name: "교육운영 매니저",
    role: "em",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "c1",
    email: "coach1@example.com",
    name: "김실습",
    role: "coach",
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "c2",
    email: "coach2@example.com",
    name: "이코치",
    role: "coach",
    createdAt: "2024-01-02T00:00:00Z",
  },
];

export const mockSchedules: Schedule[] = [
  {
    id: "s1",
    title: "신입 실무 교육 1기",
    date: "2025-03-15",
    startTime: "09:00",
    endTime: "12:00",
    location: "본사 3층 세미나실",
    capacity: 20,
    status: "open",
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "s2",
    title: "고급 실습 워크숍",
    date: "2025-03-20",
    startTime: "14:00",
    endTime: "17:00",
    location: "온라인",
    capacity: 15,
    status: "open",
    createdAt: "2025-03-02T00:00:00Z",
  },
  {
    id: "s3",
    title: "기초 실습 오리엔테이션",
    date: "2025-03-25",
    startTime: "10:00",
    endTime: "11:30",
    location: "본사 2층",
    capacity: 30,
    status: "draft",
    createdAt: "2025-03-05T00:00:00Z",
  },
  {
    id: "s0",
    title: "완료된 교육 샘플",
    date: "2025-03-10",
    startTime: "09:00",
    endTime: "12:00",
    location: "본사",
    capacity: 20,
    status: "completed",
    createdAt: "2025-02-01T00:00:00Z",
  },
];

export const mockCoachProfiles: CoachProfile[] = [
  {
    id: "cp1",
    userId: "c1",
    name: "김실습",
    level: 2,
    specialty: "실무 기초",
    bio: "3년차 실습코치",
    totalSessions: 24,
    rating: 4.8,
    updatedAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "cp2",
    userId: "c2",
    name: "이코치",
    level: 1,
    specialty: "고급 실습",
    bio: "전문 분야 집중",
    totalSessions: 12,
    rating: 4.5,
    updatedAt: "2025-03-01T00:00:00Z",
  },
];

export const mockAssignments: Assignment[] = [
  {
    id: "a1",
    scheduleId: "s1",
    coachId: "c1",
    coachName: "김실습",
    status: "pending",
    recommendedScore: 92,
    assignedAt: "2025-03-08T10:00:00Z",
  },
  {
    id: "a2",
    scheduleId: "s1",
    coachId: "c2",
    coachName: "이코치",
    status: "accepted",
    recommendedScore: 88,
    assignedAt: "2025-03-08T10:00:00Z",
    respondedAt: "2025-03-09T09:00:00Z",
  },
  {
    id: "a3",
    scheduleId: "s2",
    coachId: "c1",
    coachName: "김실습",
    status: "confirmed",
    recommendedScore: 95,
    assignedAt: "2025-03-10T00:00:00Z",
    respondedAt: "2025-03-10T12:00:00Z",
    confirmedAt: "2025-03-11T00:00:00Z",
  },
  {
    id: "a0",
    scheduleId: "s0",
    coachId: "c1",
    coachName: "김실습",
    status: "confirmed",
    assignedAt: "2025-03-05T00:00:00Z",
    respondedAt: "2025-03-06T00:00:00Z",
    confirmedAt: "2025-03-07T00:00:00Z",
  },
];

export const mockReviews: Review[] = [
  {
    id: "r1",
    assignmentId: "a0",
    scheduleId: "s0",
    coachId: "c1",
    content: "실무 위주로 진행했고, 질문이 많아서 좋았습니다.",
    issues: "프로젝터 연결이 잠깐 안 됐었음.",
    rating: 5,
    submittedAt: "2025-03-10T14:00:00Z",
  },
];

export const mockAutoAssignRules: AutoAssignRule[] = [
  {
    id: "rule1",
    name: "기본 추천 규칙",
    enabled: true,
    priority: 1,
    conditions: "레벨 1 이상, 해당 분야 전문성 일치",
    weightLevel: 1.2,
    weightSpecialty: 1.5,
    weightRating: 1.0,
    weightAvailability: 1.0,
    updatedAt: "2025-03-01T00:00:00Z",
  },
];
