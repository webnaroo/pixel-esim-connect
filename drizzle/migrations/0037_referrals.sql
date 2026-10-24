-- Empfehlen & Verdienen: jeder Kunde hat einen Code. Wer sich damit anmeldet und zum ersten Mal kauft, bekommt 2 € GlobeMoney,
-- der Werber ebenfalls 2 €. Die Gutschriften landen als Buchungen in loyalty_adjustments (zählen nicht für die Stufe).
-- Zugriff nur über Serverfunktionen (service_role).
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.referrals (
  referred_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  reward_order_id uuid,
  CHECK (referred_id <> referrer_id)
);
CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.referral_codes TO service_role;
GRANT ALL ON public.referrals TO service_role;
