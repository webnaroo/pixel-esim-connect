-- Push-Mitteilungen der Android-App: ein Eintrag pro Gerät (FCM-Token).
-- Zugriff nur über Serverfunktionen (service_role); Kunden lesen oder schreiben die Tabelle nie direkt.
CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android','ios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_devices_user_idx ON public.push_devices (user_id);
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.push_devices TO service_role;
