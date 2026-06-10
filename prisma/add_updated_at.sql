-- content 테이블에 updated_at 컬럼 추가 (보고 수정 추적용)
-- Supabase SQL Editor 또는 psql에서 실행하세요.

ALTER TABLE content
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 기존 행: 최초 작성 시각과 동일하게 설정 (수정으로 간주하지 않음)
UPDATE content
SET updated_at = created_at
WHERE updated_at IS NULL;

-- NOT NULL 및 기본값 설정
ALTER TABLE content
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE content
ALTER COLUMN updated_at SET NOT NULL;
