/**
 * Google Sheets 연동용 env (서버 전용 값).
 * `lib/data.ts`는 "use server"라 동기 export가 불가 → 이 파일에서만 export.
 */
export function isSheetsEnvConfigured(): boolean {
  return (
    !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim() &&
    !!process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim() &&
    !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()
  );
}
