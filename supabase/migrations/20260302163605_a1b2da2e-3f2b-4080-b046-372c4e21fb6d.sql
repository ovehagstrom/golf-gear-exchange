
-- Create import logs table
CREATE TABLE public.external_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  imported_count integer NOT NULL DEFAULT 0,
  skipped_duplicates_count integer NOT NULL DEFAULT 0,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'success',
  error_message text
);

-- Enable RLS
ALTER TABLE public.external_import_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view import logs"
ON public.external_import_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No client-side insert/update/delete — only service_role from edge functions
