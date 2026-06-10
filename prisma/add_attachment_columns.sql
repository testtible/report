-- 일일 보고서 첨부파일 컬럼 추가 (1개, 최대 10MB)
-- Supabase SQL Editor 또는 psql에서 실행하세요.

ALTER TABLE content
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE content
ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT;

ALTER TABLE content
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

ALTER TABLE content
ADD COLUMN IF NOT EXISTS attachment_data BYTEA;
