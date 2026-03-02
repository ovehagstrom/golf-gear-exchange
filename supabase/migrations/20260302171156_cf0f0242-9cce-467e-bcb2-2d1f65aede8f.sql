ALTER TABLE public.external_import_logs
ADD COLUMN skipped_non_driver_count integer NOT NULL DEFAULT 0;