import { prisma } from "@/app/lib/prisma";

export type DivisionItem = {
  id: string;
  name: string;
  createdAt: string;
};

export type DepartmentItem = {
  id: string;
  name: string;
  divisionId: number | null;
  createdAt: string;
};

/**
 * DB의 division(부문/본부) 목록을 안전하게 조회합니다.
 */
export async function getDivisionsFromDb(): Promise<DivisionItem[]> {
  try {
    const rows = await prisma.$queryRaw<
      { id: bigint; name: string | null; created_at: Date }[]
    >`
      SELECT id, name, created_at
      FROM division
      ORDER BY id ASC
    `;
    return rows.map((r) => ({
      id: r.id.toString(),
      name: r.name ?? "",
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));
  } catch (e) {
    console.error("Failed to fetch divisions from DB:", e);
    return [];
  }
}

/**
 * DB의 department(부서/팀) 목록을 안전하게 조회합니다.
 */
export async function getDepartmentsFromDb(
  divisionId?: number,
): Promise<DepartmentItem[]> {
  try {
    let rows: {
      id: bigint;
      name: string | null;
      division_id: number | null;
      created_at: Date;
    }[];
    if (divisionId !== undefined) {
      rows = await prisma.$queryRaw<
        {
          id: bigint;
          name: string | null;
          division_id: number | null;
          created_at: Date;
        }[]
      >`
        SELECT id, name, division_id, created_at
        FROM department
        WHERE division_id = ${divisionId}
        ORDER BY id ASC
      `;
    } else {
      rows = await prisma.$queryRaw<
        {
          id: bigint;
          name: string | null;
          division_id: number | null;
          created_at: Date;
        }[]
      >`
        SELECT id, name, division_id, created_at
        FROM department
        ORDER BY id ASC
      `;
    }
    return rows.map((r) => ({
      id: r.id.toString(),
      name: r.name ?? "",
      divisionId: r.division_id,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));
  } catch (e) {
    console.error("Failed to fetch departments from DB:", e);
    return [];
  }
}
