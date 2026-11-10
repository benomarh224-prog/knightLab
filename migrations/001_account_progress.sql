CREATE TABLE IF NOT EXISTS public.roqvyn_account_progress (
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (length(key) BETWEEN 1 AND 240),
  value text NOT NULL CHECK (octet_length(value) <= 2100000),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,key)
);
ALTER TABLE public.roqvyn_account_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roqvyn_account_progress FROM PUBLIC;
-- This table is served only by the authenticated account API. It has no public
-- Data API policy: newly enabled anonymous/authenticated roles get no rows.
CREATE OR REPLACE FUNCTION public.roqvyn_write_progress(p_user uuid,p_key text,p_value text,p_expected bigint)
RETURNS TABLE(key text,value text,version bigint,updated_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog,public AS $$
DECLARE previous bigint; existing_bytes bigint; total_bytes bigint; total_rows bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  SELECT r.version,octet_length(r.value) INTO previous,existing_bytes
    FROM public.roqvyn_account_progress r WHERE r.user_id=p_user AND r.key=p_key;
  IF coalesce(previous,0) <> p_expected THEN RAISE EXCEPTION 'progress conflict' USING ERRCODE='40001'; END IF;
  SELECT coalesce(sum(octet_length(r.value)),0),count(*) INTO total_bytes,total_rows
    FROM public.roqvyn_account_progress r WHERE r.user_id=p_user;
  IF total_bytes-coalesce(existing_bytes,0)+octet_length(p_value)>8388608 OR (previous IS NULL AND total_rows>=1000)
    THEN RAISE EXCEPTION 'account quota reached' USING ERRCODE='54000'; END IF;
  RETURN QUERY INSERT INTO public.roqvyn_account_progress AS r(user_id,key,value,version)
    VALUES(p_user,p_key,p_value,1)
    ON CONFLICT ON CONSTRAINT roqvyn_account_progress_pkey DO UPDATE SET value=excluded.value,version=r.version+1,updated_at=now()
    RETURNING r.key,r.value,r.version,r.updated_at;
END;
$$;
REVOKE ALL ON FUNCTION public.roqvyn_write_progress(uuid,text,text,bigint) FROM PUBLIC;
