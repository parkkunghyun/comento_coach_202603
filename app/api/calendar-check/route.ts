import { NextRequest } from "next/server";
import { getCalendarDebug } from "@/lib/data";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? undefined;
  const debug = await getCalendarDebug(email);
  return Response.json(debug, {
    headers: { "Cache-Control": "no-store" },
  });
}
