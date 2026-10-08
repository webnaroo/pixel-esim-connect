CREATE TABLE public.esim_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL CHECK (length(btrim(manufacturer)) > 0),
  model text NOT NULL CHECK (length(btrim(model)) > 0),
  release_year integer CHECK (release_year IS NULL OR release_year BETWEEN 2000 AND 2100),
  esim_supported boolean NOT NULL DEFAULT true,
  notes text,
  source_url text NOT NULL CHECK (source_url ~ '^https?://'),
  checked_at date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX esim_devices_mfr_model_uidx ON public.esim_devices (lower(btrim(manufacturer)), lower(btrim(model)));
CREATE INDEX esim_devices_mfr_model_idx ON public.esim_devices (manufacturer, model);
GRANT SELECT ON public.esim_devices TO anon, authenticated;
GRANT ALL ON public.esim_devices TO service_role;
ALTER TABLE public.esim_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active devices" ON public.esim_devices FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins read all devices" ON public.esim_devices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER esim_devices_updated BEFORE UPDATE ON public.esim_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();