import { NextRequest, NextResponse } from "next/server";
import {
  getFullOrganization,
  getDivisionsFromDb,
  getDepartmentsFromDb,
  getTeamsFromDb,
} from "@/app/lib/organization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const divisionIdParam = searchParams.get("divisionId");
    const departmentIdParam = searchParams.get("departmentId");

    // 특정 부문이나 부서만 필터링하는 경우
    if (divisionIdParam || departmentIdParam) {
      const divisionId = divisionIdParam ? Number(divisionIdParam) : undefined;
      const departmentId = departmentIdParam
        ? Number(departmentIdParam)
        : undefined;

      const [divisions, departments, teams] = await Promise.all([
        getDivisionsFromDb(),
        getDepartmentsFromDb(
          isNaN(divisionId as number) ? undefined : divisionId,
        ),
        getTeamsFromDb(
          isNaN(departmentId as number) ? undefined : departmentId,
        ),
      ]);

      return NextResponse.json({ divisions, departments, teams });
    }

    // 기본: 전체 조직 및 계층 구조(Tree) 반환
    const fullOrg = await getFullOrganization();
    return NextResponse.json(fullOrg);
  } catch (error) {
    console.error("GET /api/organization error:", error);
    return NextResponse.json(
      { error: "조직 정보(부문/부서/팀)를 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
