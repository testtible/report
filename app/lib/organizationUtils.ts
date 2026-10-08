/**
 * 부문 > 부서 > 팀 계층에서 중복된 명칭(예: 구매본부 > 구매본부 > 구매팀)을 깔끔하게 제거하여
 * 2단계 또는 3단계에 맞게 빵부스러기(Breadcrumb) 배열을 생성합니다.
 */
export function getDeduplicatedOrgPath(
  divisionName?: string | null,
  departmentName?: string | null,
  teamName?: string | null,
): string[] {
  const rawParts = [divisionName, departmentName, teamName]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));

  return rawParts.filter(
    (name, idx, arr) => idx === 0 || name !== arr[idx - 1],
  );
}

/**
 * 중복 제거된 계층 경로를 " › " 구분자로 결합된 문자열로 반환합니다.
 */
export function formatOrgBreadcrumb(
  divisionName?: string | null,
  departmentName?: string | null,
  teamName?: string | null,
): string {
  return getDeduplicatedOrgPath(divisionName, departmentName, teamName).join(" › ");
}
