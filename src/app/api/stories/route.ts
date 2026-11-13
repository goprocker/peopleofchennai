import { NextResponse, type NextRequest } from "next/server";
import { listStories } from "@/lib/db/public";
import { errorResponse } from "@/lib/errors";
import { listQuerySchema } from "@/lib/validation/query";

/** Public, read-only list of published stories. */
export async function GET(req: NextRequest) {
  try {
    const { page } = listQuerySchema.parse({ page: req.nextUrl.searchParams.get("page") ?? undefined });
    const result = await listStories(page);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
