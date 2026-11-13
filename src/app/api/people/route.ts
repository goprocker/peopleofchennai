import { NextResponse, type NextRequest } from "next/server";
import { listPeople } from "@/lib/db/public";
import { errorResponse } from "@/lib/errors";
import { parsePeopleQuery } from "@/lib/validation/query";

/** Public, read-only search over published profiles. Same lenient parsing as /people. */
export async function GET(req: NextRequest) {
  try {
    const result = await listPeople(parsePeopleQuery(req.nextUrl.searchParams));
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
