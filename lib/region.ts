/**
 * 캘린더 이벤트의 위치·메모에서 지역을 분류합니다.
 * 서울 / 경기도 지역 / 지방 / 기타
 */
export type EventRegion = "서울" | "경기도 지역" | "지방" | "기타";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** 위치와 메모(description)에서 지역 키워드를 찾아 분류 */
export function getEventRegion(location?: string, description?: string): EventRegion {
  const loc = (location ?? "").trim();
  const desc = description ? stripHtml(description) : "";
  const combined = `${loc} ${desc}`.trim().toLowerCase();

  if (!combined) return "기타";

  // 서울: 서울특별시, 서울시, 서울 등
  if (/서울/.test(combined)) return "서울";

  // 경기도 지역: 경기, 경기도
  if (/경기/.test(combined)) return "경기도 지역";

  // 지방: 광역시·도 키워드 (경기 제외)
  const regionalKeywords = [
    "부산", "대구", "대전", "광주", "인천", "울산", "세종",
    "강원", "충북", "충남", "충청", "전북", "전남", "경북", "경남", "제주",
    "울산기술교육원", "대구광역", "부산광역", "인천광역", "광주광역", "대전광역",
  ];
  for (const kw of regionalKeywords) {
    if (combined.includes(kw.toLowerCase())) return "지방";
  }

  return "기타";
}
