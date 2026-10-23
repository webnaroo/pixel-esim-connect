-- Hinweis "eSIM läuft bald ab": pro eSIM nur einmal senden (Push, siehe cron/esim-expiry-alerts).
ALTER TABLE public.esims ADD COLUMN expiry_alert_sent_at timestamptz;
