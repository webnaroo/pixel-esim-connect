CREATE TYPE public.app_role AS ENUM ('admin','support','user');
CREATE TYPE public.destination_type AS ENUM ('country','region','global');
CREATE TYPE public.plan_type AS ENUM ('data','unlimited');
CREATE TYPE public.order_status AS ENUM ('pending','paid','fulfilling','fulfilled','fulfillment_failed','refunded','cancelled');
CREATE TYPE public.webhook_source AS ENUM ('stripe','provider');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text, name text, locale text NOT NULL DEFAULT 'de',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- settings
CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings read" ON public.app_settings FOR SELECT TO anon, authenticated USING (key IN ('shop_enabled','vat_rate','default_currency','popular_destinations','site_url'));
CREATE POLICY "admin settings all read" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin settings write" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin settings update" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- destinations
CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.destination_type NOT NULL DEFAULT 'country',
  slug text NOT NULL UNIQUE,
  iso_code text,
  provider_ref jsonb,
  name_de text NOT NULL, name_en text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  flag_code text,
  continent text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.destinations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "destinations public read" ON public.destinations FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "destinations admin write" ON public.destinations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.destination_countries (
  region_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  PRIMARY KEY (region_id, country_id)
);
GRANT SELECT ON public.destination_countries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destination_countries TO authenticated;
GRANT ALL ON public.destination_countries TO service_role;
ALTER TABLE public.destination_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dc public read" ON public.destination_countries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dc admin write" ON public.destination_countries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.destinations_content (
  destination_id uuid PRIMARY KEY REFERENCES public.destinations(id) ON DELETE CASCADE,
  intro text, faq jsonb, network_info jsonb, seo_title text, seo_description text
);
GRANT SELECT ON public.destinations_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destinations_content TO authenticated;
GRANT ALL ON public.destinations_content TO service_role;
ALTER TABLE public.destinations_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content public read" ON public.destinations_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "content admin write" ON public.destinations_content FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- plans (filled only by catalog sync)
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'esimerge',
  provider_plan_id text NOT NULL,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  type public.plan_type NOT NULL,
  data_mb int,
  validity_days int NOT NULL,
  network_type text,
  networks text[],
  hotspot boolean,
  voice_sms jsonb,
  fair_use jsonb,
  top_upable boolean,
  cost_price numeric(12,4) NOT NULL,
  cost_currency text NOT NULL,
  sell_price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  badge text,
  is_active boolean NOT NULL DEFAULT true,
  raw jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_plan_id, destination_id)
);
CREATE INDEX plans_destination_idx ON public.plans(destination_id) WHERE is_active;
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- hide cost data from the public
REVOKE SELECT ON public.plans FROM anon, authenticated;
GRANT SELECT (id, provider, destination_id, type, data_mb, validity_days, network_type, networks, hotspot, voice_sms, fair_use, top_upable, sell_price, currency, badge, is_active, updated_at) ON public.plans TO anon, authenticated;

CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global', -- global | destination | plan_type | plan
  scope_ref text,
  type text NOT NULL DEFAULT 'percent', -- percent | fixed
  value numeric(12,4) NOT NULL,
  rounding text, -- e.g. '0.99'
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing admin" ON public.pricing_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL, to_currency text NOT NULL,
  rate numeric(14,6) NOT NULL, valid_from timestamptz NOT NULL DEFAULT now(), source text NOT NULL DEFAULT 'manual'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_rates TO authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx admin" ON public.fx_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  guest_email text NOT NULL,
  plan_id uuid REFERENCES public.plans(id),
  plan_snapshot jsonb,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  tax numeric(12,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text UNIQUE,
  idempotency_key text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  fulfillment_attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- esims: activation data never readable by clients; served via server functions only
CREATE TABLE public.esims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid,
  provider text NOT NULL DEFAULT 'esimerge',
  provider_order_id text,
  iccid text,
  smdp_address text,
  activation_code text,
  lpa_string text,
  qr_image_url text,
  direct_install_url text,
  install_status text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.esims TO service_role;
GRANT SELECT (id, order_id, user_id, provider, iccid, install_status, status, expires_at, created_at) ON public.esims TO authenticated;
ALTER TABLE public.esims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own esims" ON public.esims FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER esims_updated BEFORE UPDATE ON public.esims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- server-only operational tables
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.webhook_source NOT NULL, event_id text NOT NULL,
  payload jsonb, processed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, event_id)
);
CREATE TABLE public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, endpoint text NOT NULL, status int, latency_ms int, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.provider_raw_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL, status int, body_sanitized jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  countries int NOT NULL DEFAULT 0, plans_added int NOT NULL DEFAULT 0, plans_updated int NOT NULL DEFAULT 0, plans_deactivated int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running', error text
);
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, action text NOT NULL, entity text, entity_id text, meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_events, public.api_logs, public.provider_raw_samples, public.sync_runs, public.audit_log TO authenticated;
GRANT ALL ON public.webhook_events, public.api_logs, public.provider_raw_samples, public.sync_runs, public.audit_log TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_raw_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON public.webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.api_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.provider_raw_samples FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- content
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, email text NOT NULL, subject text NOT NULL, message text NOT NULL, order_id uuid,
  status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.support_tickets TO anon, authenticated;
GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "create ticket" ON public.support_tickets FOR INSERT TO anon, authenticated WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND status = 'open' AND length(message) < 5000);
CREATE POLICY "read own ticket" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "staff update ticket" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, title text NOT NULL, body_md text NOT NULL DEFAULT '', cover_url text,
  published_at timestamptz, seo jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general', question text NOT NULL, answer text NOT NULL, sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.blog_posts, public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts, public.faqs TO authenticated;
GRANT ALL ON public.blog_posts, public.faqs TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog public read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (published_at IS NOT NULL AND published_at <= now() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "blog admin" ON public.blog_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "faq public read" ON public.faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "faq admin" ON public.faqs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- public "from" price per destination
CREATE OR REPLACE VIEW public.destination_prices WITH (security_invoker = true) AS
  SELECT destination_id, min(sell_price) AS from_price, count(*) AS plan_count,
         bool_or(type = 'data') AS has_data, bool_or(type = 'unlimited') AS has_unlimited
  FROM public.plans WHERE is_active GROUP BY destination_id;
GRANT SELECT ON public.destination_prices TO anon, authenticated;