-- content 테이블에 master_comment 컬럼 추가
-- Supabase SQL Editor 또는 psql에서 실행하세요.

ALTER TABLE content
ADD COLUMN IF NOT EXISTS master_comment TEXT;
