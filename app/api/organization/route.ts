import { NextRequest, NextResponse } from "next/server";
import {
  getDivisionsFromDb,
  getDepartmentsFromDb,
} from "@/app/lib/organization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const divisionIdParam = searchParams.get("divisionId");
    const divisionId = divisionIdParam ? Number(divisionIdParam) : undefined;

    const [divisions, departments] = await Promise.all([
      getDivisionsFromDb(),
      getDepartmentsFromDb(
        isNaN(divisionId as number) ? undefined : divisionId,
      ),
    ]);

    return NextResponse.json({ divisions, departments });
  } catch (error) {
    console.error("GET /api/organization error:", error);
    return NextResponse.json(
      { error: "조직 정보(부문/부서)를 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
