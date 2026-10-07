import { prisma } from "@/app/lib/prisma";

export type UserItem = {
  id: string;
  name: string;
};

/**
 * DB의 user 테이블에서 전체 팀원 목록을 조회합니다.
 */
export async function getUsersFromDb(): Promise<UserItem[]> {
  try {
    const rows = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    return rows.map((r) => ({
      id: r.id.toString(),
      name: r.name,
    }));
  } catch (e) {
    console.error("Failed to fetch users from DB:", e);
    return [];
  }
}

/**
 * 이름으로 해당 사용자의 user_id를 조회합니다.
 */
export async function findUserIdByName(name: string): Promise<bigint | null> {
  try {
    const user = await prisma.user.findFirst({
      where: { name: name.trim() },
      select: { id: true },
    });
    return user ? user.id : null;
  } catch {
    return null;
  }
}
