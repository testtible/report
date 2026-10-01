"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type RiskItem = {
  level: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  project: string;
  member: string;
  date: string;
  description: string;
  actionPlan: string;
};

export type RiskRadarData = {
  analyzedDateRange: string;
  totalReports: number;
  summary: string;
  risks: RiskItem[];
  rawText?: string;
};

export type ProjectItem = {
  name: string;
  percentage: number;
  color?: string;
  description: string;
  members: string[];
};

export type MemberWorkload = {
  username: string;
  primaryProject: string;
  recentFocus: string;
  workloadStatus: "HIGH" | "NORMAL" | "LOW";
};

export type WorkloadData = {
  analyzedDateRange: string;
  totalReports: number;
  summary: string;
  projects: ProjectItem[];
  memberWorkloads: MemberWorkload[];
  teamInsights: string;
  rawText?: string;
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export type SubmittedReportItem = {
  username: string;
  content: string;
};

const STALE_TIME = 30 * 60 * 1000; // 30분
const CACHE_KEY_RISK = "aerix_cache_risk_radar_v1";
const CACHE_KEY_WORKLOAD = "aerix_cache_workload_analysis_v1";
const CACHE_KEY_PROJECT_PREFIX = "aerix_cache_project_summary_v1_";
const MAX_RETRIES = 2; // 실패 시 최대 재시도 횟수

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCached<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || !parsed.data || typeof parsed.timestamp !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.warn("Local storage cache write failed:", err);
  }
}

export function useAiReportPrefetch(
  selectedDate?: string,
  reports?: SubmittedReportItem[]
) {
  // 1순위: AI 프로젝트별 정리 상태
  const [projectSummaryData, setProjectSummaryData] = useState<string | null>(null);
  const [isProjectSummaryLoading, setIsProjectSummaryLoading] = useState(false);
  const [projectSummaryError, setProjectSummaryError] = useState<string | null>(null);
  const [projectSummaryUpdatedAt, setProjectSummaryUpdatedAt] = useState<number | null>(null);

  // 2순위: AI 리스크 레이더 상태
  const [riskRadarData, setRiskRadarData] = useState<RiskRadarData | null>(null);
  const [isRiskRadarLoading, setIsRiskRadarLoading] = useState(false);
  const [riskRadarError, setRiskRadarError] = useState<string | null>(null);
  const [riskRadarUpdatedAt, setRiskRadarUpdatedAt] = useState<number | null>(null);

  // 3순위: 업무 비중 분석 상태
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null);
  const [isWorkloadLoading, setIsWorkloadLoading] = useState(false);
  const [workloadError, setWorkloadError] = useState<string | null>(null);
  const [workloadUpdatedAt, setWorkloadUpdatedAt] = useState<number | null>(null);

  // ⭐️ [중요] 단일 실행 뮤텍스 (Global AI Lock)
  // 어떤 경우에도 2개 이상의 AI 분석 API가 동시에 날아가지 않도록 전역 잠금 제어
  const isAiBusyRef = useRef(false);

  // 렌더링 간 항상 최신 값 참조
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const reportsRef = useRef(reports);
  reportsRef.current = reports;

  // 1순위: 프로젝트별 정리 실행 (실패 시 최대 MAX_RETRIES회 자동 재시도)
  const executeProjectSummary = useCallback(async (force = false) => {
    const curDate = selectedDateRef.current;
    const curReports = reportsRef.current;

    if (!curDate || !curReports || curReports.length === 0) {
      console.log("[AI Queue] 프로젝트별 정리: 제출된 보고서가 없어 호출을 건너뜁니다.");
      return;
    }

    const cacheKey = `${CACHE_KEY_PROJECT_PREFIX}${curDate}`;
    if (!force) {
      const cached = getCached<string>(cacheKey);
      if (cached && Date.now() - cached.timestamp < STALE_TIME) {
        setProjectSummaryData(cached.data);
        setProjectSummaryUpdatedAt(cached.timestamp);
        return;
      }
    }

    setIsProjectSummaryLoading(true);
    setProjectSummaryError(null);

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        console.log(`[AI Queue] 프로젝트별 정리 호출 시도 (${attempt + 1}/${MAX_RETRIES + 1})`);
        const res = await fetch("/api/report/project-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: curDate,
            reports: curReports,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `서버 응답 오류 (${res.status})`);
        }
        const summary = json.summary || "";
        setProjectSummaryData(summary);
        const now = Date.now();
        setProjectSummaryUpdatedAt(now);
        setCached(cacheKey, summary);
        setProjectSummaryError(null);
        setIsProjectSummaryLoading(false);
        console.log("[AI Queue] 프로젝트별 정리 호출 성공 완료");
        return;
      } catch (err) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : "프로젝트 취합 중 오류가 발생했습니다.";
        if (attempt <= MAX_RETRIES) {
          const waitSec = attempt * 5;
          console.warn(
            `[AI Queue] 프로젝트별 정리 실패 (${errMsg}) - ${waitSec}초 후 자동 재시도 (${attempt}/${MAX_RETRIES})`
          );
          setProjectSummaryError(`일시적 지연으로 재시도 대기 중입니다... (${attempt}/${MAX_RETRIES})`);
          await delay(waitSec * 1000);
        } else {
          console.error(`[AI Queue] 프로젝트별 정리 최종 실패: ${errMsg}`);
          setProjectSummaryError(errMsg);
          setIsProjectSummaryLoading(false);
        }
      }
    }
  }, []);

  // 2순위: 리스크 레이더 실행 (실패 시 최대 MAX_RETRIES회 자동 재시도)
  const executeRiskRadar = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCached<RiskRadarData>(CACHE_KEY_RISK);
      if (cached && Date.now() - cached.timestamp < STALE_TIME) {
        setRiskRadarData(cached.data);
        setRiskRadarUpdatedAt(cached.timestamp);
        return;
      }
    }

    setIsRiskRadarLoading(true);
    setRiskRadarError(null);

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        console.log(`[AI Queue] 리스크 레이더 호출 시도 (${attempt + 1}/${MAX_RETRIES + 1})`);
        const res = await fetch("/api/report/risk-radar", { method: "POST" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `서버 응답 오류 (${res.status})`);
        }
        setRiskRadarData(json.data);
        const now = Date.now();
        setRiskRadarUpdatedAt(now);
        setCached(CACHE_KEY_RISK, json.data);
        setRiskRadarError(null);
        setIsRiskRadarLoading(false);
        console.log("[AI Queue] 리스크 레이더 호출 성공 완료");
        return;
      } catch (err) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : "리스크 분석 중 오류가 발생했습니다.";
        if (attempt <= MAX_RETRIES) {
          const waitSec = attempt * 5;
          console.warn(
            `[AI Queue] 리스크 레이더 실패 (${errMsg}) - ${waitSec}초 후 자동 재시도 (${attempt}/${MAX_RETRIES})`
          );
          setRiskRadarError(`일시적 지연으로 재시도 대기 중입니다... (${attempt}/${MAX_RETRIES})`);
          await delay(waitSec * 1000);
        } else {
          console.error(`[AI Queue] 리스크 레이더 최종 실패: ${errMsg}`);
          setRiskRadarError(errMsg);
          setIsRiskRadarLoading(false);
        }
      }
    }
  }, []);

  // 3순위: 업무 비중 분석 실행 (실패 시 최대 MAX_RETRIES회 자동 재시도)
  const executeWorkload = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCached<WorkloadData>(CACHE_KEY_WORKLOAD);
      if (cached && Date.now() - cached.timestamp < STALE_TIME) {
        setWorkloadData(cached.data);
        setWorkloadUpdatedAt(cached.timestamp);
        return;
      }
    }

    setIsWorkloadLoading(true);
    setWorkloadError(null);

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        console.log(`[AI Queue] 업무 비중 분석 호출 시도 (${attempt + 1}/${MAX_RETRIES + 1})`);
        const res = await fetch("/api/report/workload-analysis", { method: "POST" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `서버 응답 오류 (${res.status})`);
        }
        setWorkloadData(json.data);
        const now = Date.now();
        setWorkloadUpdatedAt(now);
        setCached(CACHE_KEY_WORKLOAD, json.data);
        setWorkloadError(null);
        setIsWorkloadLoading(false);
        console.log("[AI Queue] 업무 비중 분석 호출 성공 완료");
        return;
      } catch (err) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : "업무 비중 분석 중 오류가 발생했습니다.";
        if (attempt <= MAX_RETRIES) {
          const waitSec = attempt * 5;
          console.warn(
            `[AI Queue] 업무 비중 분석 실패 (${errMsg}) - ${waitSec}초 후 자동 재시도 (${attempt}/${MAX_RETRIES})`
          );
          setWorkloadError(`일시적 지연으로 재시도 대기 중입니다... (${attempt}/${MAX_RETRIES})`);
          await delay(waitSec * 1000);
        } else {
          console.error(`[AI Queue] 업무 비중 분석 최종 실패: ${errMsg}`);
          setWorkloadError(errMsg);
          setIsWorkloadLoading(false);
        }
      }
    }
  }, []);

  // 순차 큐 실행 (Global Lock을 획득하여 무조건 1개씩 순서대로 실행)
  // 분석 순서: AI 프로젝트별 정리(1순위) -> AI 리스크 레이더(2순위) -> 업무 비중 분석(3순위)
  const runSequentialPrefetch = useCallback(async (force = false) => {
    if (isAiBusyRef.current) {
      console.log("[AI Queue] 이미 AI 분석 작업이 진행 중이므로 중복 호출을 차단합니다.");
      return;
    }

    isAiBusyRef.current = true;
    try {
      // 1) AI 프로젝트별 정리 우선 실행 (1순위)
      await executeProjectSummary(force);

      // Ollama GPU 부하 방지 및 안정화를 위해 1.5초 대기
      await delay(1500);

      // 2) AI 리스크 레이더 실행 (2순위)
      await executeRiskRadar(force);

      // Ollama GPU 부하 방지 및 안정화를 위해 1.5초 대기
      await delay(1500);

      // 3) 업무 비중 분석 실행 (3순위)
      await executeWorkload(force);
    } finally {
      // 모든 작업 완료(또는 재시도 종료) 후 전역 락 해제
      isAiBusyRef.current = false;
    }
  }, [executeProjectSummary, executeRiskRadar, executeWorkload]);

  // 개별 수동 단독 새로고침 (다른 작업과 충돌 방지)
  const refreshSingleProjectSummary = useCallback(async () => {
    if (isAiBusyRef.current) {
      alert("현재 다른 AI 분석 작업이 진행 중입니다. 잠시 후 완료되면 다시 시도해주세요.");
      return;
    }
    isAiBusyRef.current = true;
    try {
      await executeProjectSummary(true);
    } finally {
      isAiBusyRef.current = false;
    }
  }, [executeProjectSummary]);

  const refreshSingleRiskRadar = useCallback(async () => {
    if (isAiBusyRef.current) {
      alert("현재 다른 AI 분석 작업이 진행 중입니다. 잠시 후 완료되면 다시 시도해주세요.");
      return;
    }
    isAiBusyRef.current = true;
    try {
      await executeRiskRadar(true);
    } finally {
      isAiBusyRef.current = false;
    }
  }, [executeRiskRadar]);

  const refreshSingleWorkload = useCallback(async () => {
    if (isAiBusyRef.current) {
      alert("현재 다른 AI 분석 작업이 진행 중입니다. 잠시 후 완료되면 다시 시도해주세요.");
      return;
    }
    isAiBusyRef.current = true;
    try {
      await executeWorkload(true);
    } finally {
      isAiBusyRef.current = false;
    }
  }, [executeWorkload]);

  // 마운트 시 초기화, 날짜 변경 시 복원, 30분 주기 리프레시, 탭 복귀 이벤트 처리
  useEffect(() => {
    // 1. 로컬 캐시 즉시 메모리에 복원 (0초 렌더링)
    if (selectedDate) {
      const cacheKey = `${CACHE_KEY_PROJECT_PREFIX}${selectedDate}`;
      const cachedProject = getCached<string>(cacheKey);
      if (cachedProject) {
        setProjectSummaryData(cachedProject.data);
        setProjectSummaryUpdatedAt(cachedProject.timestamp);
      } else {
        setProjectSummaryData(null);
        setProjectSummaryUpdatedAt(null);
      }
    }

    const cachedRisk = getCached<RiskRadarData>(CACHE_KEY_RISK);
    if (cachedRisk) {
      setRiskRadarData(cachedRisk.data);
      setRiskRadarUpdatedAt(cachedRisk.timestamp);
    }

    const cachedWorkload = getCached<WorkloadData>(CACHE_KEY_WORKLOAD);
    if (cachedWorkload) {
      setWorkloadData(cachedWorkload.data);
      setWorkloadUpdatedAt(cachedWorkload.timestamp);
    }

    // 2. 캐시가 없거나 30분 만료 시 순차 단일 큐 실행
    let isProjectStale = false;
    if (selectedDate && reports && reports.length > 0) {
      const cacheKey = `${CACHE_KEY_PROJECT_PREFIX}${selectedDate}`;
      const cachedProject = getCached<string>(cacheKey);
      isProjectStale = !cachedProject || Date.now() - cachedProject.timestamp >= STALE_TIME;
    }
    const isRiskStale = !cachedRisk || Date.now() - cachedRisk.timestamp >= STALE_TIME;
    const isWorkloadStale = !cachedWorkload || Date.now() - cachedWorkload.timestamp >= STALE_TIME;

    if (isProjectStale || isRiskStale || isWorkloadStale) {
      runSequentialPrefetch(false);
    }

    // 3. 30분 주기 백그라운드 자동 리프레시 타이머
    const intervalId = setInterval(() => {
      console.log("[AI Queue] 30분 주기 경과 - 순차 자동 리프레시 시작");
      runSequentialPrefetch(true);
    }, STALE_TIME);

    // 4. 탭 복귀(visibilitychange) 시: 이미 진행 중이면 절대 중복 실행하지 않음!
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (isAiBusyRef.current) {
          console.log("[AI Queue] 탭 복귀 감지되었으나 이미 작업 중이므로 중복 호출 방지");
          return;
        }

        const curDate = selectedDateRef.current;
        const curReports = reportsRef.current;
        let pStale = false;
        if (curDate && curReports && curReports.length > 0) {
          const cp = getCached<string>(`${CACHE_KEY_PROJECT_PREFIX}${curDate}`);
          pStale = !cp || Date.now() - cp.timestamp >= STALE_TIME;
        }

        const curRisk = getCached<RiskRadarData>(CACHE_KEY_RISK);
        const curWorkload = getCached<WorkloadData>(CACHE_KEY_WORKLOAD);
        const riskStale = !curRisk || Date.now() - curRisk.timestamp >= STALE_TIME;
        const workloadStale = !curWorkload || Date.now() - curWorkload.timestamp >= STALE_TIME;

        if (pStale || riskStale || workloadStale) {
          console.log("[AI Queue] 탭 복귀 - 만료된 데이터 순차 갱신 시작");
          runSequentialPrefetch(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedDate, reports, runSequentialPrefetch]);

  return {
    projectSummary: {
      data: projectSummaryData,
      isLoading: isProjectSummaryLoading,
      error: projectSummaryError,
      updatedAt: projectSummaryUpdatedAt,
      refresh: refreshSingleProjectSummary,
    },
    riskRadar: {
      data: riskRadarData,
      isLoading: isRiskRadarLoading,
      error: riskRadarError,
      updatedAt: riskRadarUpdatedAt,
      refresh: refreshSingleRiskRadar,
    },
    workload: {
      data: workloadData,
      isLoading: isWorkloadLoading,
      error: workloadError,
      updatedAt: workloadUpdatedAt,
      refresh: refreshSingleWorkload,
    },
    prefetchAll: () => runSequentialPrefetch(true),
  };
}
