# 실습코치 관리 대시보드

Next.js + TypeScript + TailwindCSS 기반의 실습코치/교육 운영 매니저 대시보드입니다.  
데이터 저장소는 **Google Spreadsheet**를 API처럼 사용합니다.

## 기술 스택

- **Next.js** 14 (App Router)
- **TypeScript**
- **TailwindCSS**
- **Google Sheets API** (googleapis)

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속 후 로그인 화면에서 이메일과 로그인 유형(EM / 실습코치)을 선택해 로그인하세요.

### 데모 계정

- **EM**: `em@example.com` / 로그인 유형: EM
- **실습코치**: `coach1@example.com` 또는 `coach2@example.com` / 로그인 유형: 실습코치

환경 변수 없이 실행하면 **Mock 데이터**로 동작합니다.

---

## Google Sheets 연동 (선택)

실제 Google 스프레드시트를 DB처럼 쓰려면 아래 설정이 필요합니다.

### 1. Google Cloud에서 API 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. **API 및 서비스** → **라이브러리**에서 **Google Sheets API** 사용 설정
3. **사용자 인증 정보** → **서비스 계정** 생성 후 **키** 추가 → JSON 키 다운로드

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 다음 값을 채웁니다.

```env
GOOGLE_SHEETS_CLIENT_EMAIL=서비스계정이메일@프로젝트.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=스프레드시트ID
```

- `GOOGLE_SHEETS_CLIENT_EMAIL`: JSON 키의 `client_email`
- `GOOGLE_SHEETS_PRIVATE_KEY`: JSON 키의 `private_key` (따옴표로 감싸고, 줄바꿈은 `\n` 유지)
- `GOOGLE_SHEETS_SPREADSHEET_ID`: 사용할 스프레드시트 URL의 `https://docs.google.com/spreadsheets/d/여기부분/edit` 값

### 3. 스프레드시트 공유 및 시트 구조

- 해당 스프레드시트를 **편집자** 권한으로 **서비스 계정 이메일**에 공유합니다.
- 아래 시트(탭)를 만들고, 첫 행에 헤더를 넣은 뒤 사용합니다.

| 시트 이름 | 용도 | 주요 열 (예시) |
|-----------|------|----------------|
| `users` | 사용자 | id, email, name, role, createdAt |
| `schedules` | 교육 일정 | id, title, date, startTime, endTime, location, capacity, status, createdAt |
| `coach_profiles` | 실습코치 프로필 | id, userId, name, level, specialty, bio, totalSessions, rating, updatedAt |
| `assignments` | 배정 | id, scheduleId, coachId, coachName, status, recommendedScore, assignedAt, respondedAt, confirmedAt |
| `reviews` | 교육 후기 | id, assignmentId, scheduleId, coachId, content, issues, rating, submittedAt |
| `auto_assign_rules` | 자동 배정 규칙 | id, name, enabled, priority, conditions, weightLevel, weightSpecialty, weightRating, weightAvailability, updatedAt |

상세 열 순서는 `lib/sheets.ts`의 읽기/쓰기 로직과 맞추면 됩니다.

---

## 기능 요약

### 로그인

- 이메일 + 로그인 유형(EM / 실습코치) 선택 후 로그인
- 역할에 따라 EM 대시보드 또는 실습코치 대시보드로 이동

### EM 대시보드

- **대시보드**: 교육 통계, 다가오는 일정
- **교육 일정**: 전체 일정 확인
- **배정 관리**: 실습코치 추천/배정, 수락·확정 관리
- **교육 후기**: 실습코치 제출 후기 및 이슈 확인
- **실습코치 프로필**: 프로필·레벨 관리
- **자동 배정 로직**: 규칙 및 가중치 확인

### 실습코치 대시보드

- **대시보드**: 배정 요청/예정 교육 요약
- **배정 요청**: 수락 / 거절
- **예정된 교육**: 수락·확정된 교육 목록
- **후기 작성**: 교육 종료 후 후기 제출

---

## UI

- Notion / Linear 스타일의 SaaS 대시보드
- 좌측 사이드바, 카드형 레이아웃, 여백 위주 디자인
- 호버 효과, 반응형(모바일에서 사이드바 드로어)
