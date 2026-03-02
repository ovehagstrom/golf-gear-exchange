
ALTER TABLE public.external_import_logs
ADD COLUMN skipped_non_golf_count integer NOT NULL DEFAULT 0,
ADD COLUMN skipped_keyword_filtered_count integer NOT NULL DEFAULT 0;
