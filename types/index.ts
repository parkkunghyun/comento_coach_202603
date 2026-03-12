export type UserRole = "em" | "coach";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Schedule {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  status: "draft" | "open" | "closed" | "completed";
  createdAt: string;
}

/** 실습코치 로그인 시트 한 행 (실습코치 프로필 목록) */
export interface CoachLoginProfile {
  rowIndex: number; // 시트 행 번호(1-based, 수정 시 사용)
  no: string;
  status: string; // 실습코치 상태 (B열)
  name: string;
  affiliation: string; // 소속 (D열, 내부면 노랑)
  email: string;
  contact: string;
  birthDate: string;
  address: string; // 거주지
}

export interface CoachProfile {
  id: string;
  userId: string;
  name: string;
  level: number;
  specialty: string;
  bio: string;
  totalSessions: number;
  rating: number;
  updatedAt: string;
}

export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "confirmed";

export interface Assignment {
  id: string;
  scheduleId: string;
  coachId: string;
  coachName?: string;
  status: AssignmentStatus;
  recommendedScore?: number;
  assignedAt: string;
  respondedAt?: string;
  confirmedAt?: string;
}

export interface Review {
  id: string;
  assignmentId: string;
  scheduleId: string;
  coachId: string;
  content: string;
  issues: string;
  rating: number;
  submittedAt: string;
}

export interface AutoAssignRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: string;
  weightLevel: number;
  weightSpecialty: number;
  weightRating: number;
  weightAvailability: number;
  updatedAt: string;
}

export interface DashboardStats {
  totalSchedules: number;
  completedSchedules: number;
  pendingAssignments: number;
  totalCoaches: number;
  avgRating: number;
}

/** 실습코치 등급 시트 한 행 (인원들 LEVEL 현황) */
export interface CoachLevelRow {
  email: string;
  name: string;
  status: string;
  affiliation: string; // 소속
  genAiAvailable: string; // 생성형AI가능 (E)
  pythonAvailable: string; // Python가능 (F)
  handsonAvailable: string; // 핸즈온가능 (G)
  handsonVerified: string; // 핸즈온검증
  handsonCount6m: string; // 최근6개월핸즈온횟수
  avgSatisfaction: string; // 평균만족도
  assignCount30d: string; // 최근30일배정횟수
  participationRestrict: string; // 참여제한여부
  weeklyCapacity: string; // 주당가능횟수
  regionalAvailable: string; // 지방가능여부
  modifiedAt: string; // 수정일
  modifiedBy: string; // 수정EM
  modifyReason: string; // 수정사유
  contact: string; // 연락처
  birthDate: string; // 생년월일
  level: string; // LEVEL (T열)
}
