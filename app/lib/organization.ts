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

export type TeamItem = {
  id: string;
  name: string;
  departmentId: number | null;
  createdAt: string;
};

export type UserOrgItem = {
  id: string;
  name: string;
  teamId: number | null;
  teamName?: string;
  departmentId?: number | null;
  departmentName?: string;
  divisionId?: number | null;
  divisionName?: string;
};

export type OrgTeamNode = {
  id: string;
  name: string;
  departmentId: number | null;
  users: { id: string; name: string; teamId: number | null }[];
};

export type OrgDepartmentNode = {
  id: string;
  name: string;
  divisionId: number | null;
  teams: OrgTeamNode[];
};

export type OrgDivisionNode = {
  id: string;
  name: string;
  departments: OrgDepartmentNode[];
};

export {
  getDeduplicatedOrgPath,
  formatOrgBreadcrumb,
} from "./organizationUtils";

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
 * DB의 department(부서/본부) 목록을 안전하게 조회합니다.
 */
export async function getDepartmentsFromDb(
  divisionId?: number,
): Promise<DepartmentItem[]> {
  try {
    let rows: {
      id: bigint;
      name: string | null;
      division_id: bigint | number | null;
      created_at: Date;
    }[];
    if (divisionId !== undefined) {
      rows = await prisma.$queryRaw<
        {
          id: bigint;
          name: string | null;
          division_id: bigint | number | null;
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
          division_id: bigint | number | null;
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
      divisionId: r.division_id != null ? Number(r.division_id) : null,
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

/**
 * DB의 team(팀) 목록을 안전하게 조회합니다.
 */
export async function getTeamsFromDb(
  departmentId?: number,
): Promise<TeamItem[]> {
  try {
    let rows: {
      id: bigint;
      name: string | null;
      department_id: bigint | number | null;
      created_at: Date;
    }[];
    if (departmentId !== undefined) {
      rows = await prisma.$queryRaw<
        {
          id: bigint;
          name: string | null;
          department_id: bigint | number | null;
          created_at: Date;
        }[]
      >`
        SELECT id, name, department_id, created_at
        FROM team
        WHERE department_id = ${departmentId}
        ORDER BY id ASC
      `;
    } else {
      rows = await prisma.$queryRaw<
        {
          id: bigint;
          name: string | null;
          department_id: bigint | number | null;
          created_at: Date;
        }[]
      >`
        SELECT id, name, department_id, created_at
        FROM team
        ORDER BY id ASC
      `;
    }
    return rows.map((r) => ({
      id: r.id.toString(),
      name: r.name ?? "",
      departmentId: r.department_id != null ? Number(r.department_id) : null,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));
  } catch (e) {
    console.error("Failed to fetch teams from DB:", e);
    return [];
  }
}

/**
 * 조직 전체 구조(division -> department -> team -> user)를 한 번에 조회하고 계층 트리를 구성합니다.
 */
export async function getFullOrganization() {
  try {
    const [divisions, departments, teams, userRows] = await Promise.all([
      getDivisionsFromDb(),
      getDepartmentsFromDb(),
      getTeamsFromDb(),
      prisma.$queryRaw<{ id: bigint; name: string; team_id: bigint | number | null }[]>`
        SELECT id, name, team_id
        FROM "user"
        ORDER BY id ASC
      `,
    ]);

    const users: UserOrgItem[] = userRows.map((u) => {
      const userTeamId = u.team_id != null ? Number(u.team_id) : null;
      const team = teams.find((t) => Number(t.id) === userTeamId);
      const dept = team
        ? departments.find((d) => Number(d.id) === team.departmentId)
        : undefined;
      const div = dept
        ? divisions.find((dv) => Number(dv.id) === dept.divisionId)
        : undefined;

      return {
        id: u.id.toString(),
        name: u.name,
        teamId: userTeamId,
        teamName: team?.name,
        departmentId: team?.departmentId ?? null,
        departmentName: dept?.name,
        divisionId: dept?.divisionId ?? null,
        divisionName: div?.name,
      };
    });

    // 계층 트리 생성 (division -> department -> team -> user)
    const hierarchy: OrgDivisionNode[] = divisions.map((div) => {
      const divIdNum = Number(div.id);
      const childDepts = departments.filter((d) => d.divisionId === divIdNum);

      return {
        id: div.id,
        name: div.name,
        departments: childDepts.map((dept) => {
          const deptIdNum = Number(dept.id);
          const childTeams = teams.filter((t) => t.departmentId === deptIdNum);

          return {
            id: dept.id,
            name: dept.name,
            divisionId: dept.divisionId,
            teams: childTeams.map((t) => {
              const teamIdNum = Number(t.id);
              const teamUsers = users
                .filter((u) => u.teamId === teamIdNum)
                .map((u) => ({ id: u.id, name: u.name, teamId: u.teamId }));

              return {
                id: t.id,
                name: t.name,
                departmentId: t.departmentId,
                users: teamUsers,
              };
            }),
          };
        }),
      };
    });

    // 소속되지 않은(미지정) 팀원들
    const unassignedUsers = users.filter((u) => !u.teamId);

    return {
      divisions,
      departments,
      teams,
      users,
      hierarchy,
      unassignedUsers,
    };
  } catch (error) {
    console.error("Failed to get full organization:", error);
    return {
      divisions: [],
      departments: [],
      teams: [],
      users: [],
      hierarchy: [],
      unassignedUsers: [],
    };
  }
}
