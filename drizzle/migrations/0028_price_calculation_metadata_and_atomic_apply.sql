ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_source text, ADD COLUMN IF NOT EXISTS price_calculated_at timestamptz, ADD COLUMN IF NOT EXISTS price_inputs jsonb, ADD COLUMN IF NOT EXISTS price_override numeric;
COMMENT ON COLUMN public.plans.price_override IS 'Explicit manual gross EUR price; never inferred from historical sell_price.';
CREATE OR REPLACE FUNCTION public.apply_price_calculation(_rows jsonb, _rules_before jsonb, _settings_before jsonb, _change jsonb, _actor uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; expected integer; current_rules jsonb; current_settings jsonb; old_rule jsonb;
BEGIN
  LOCK TABLE public.pricing_rules, public.app_settings, public.plans IN SHARE ROW EXCLUSIVE MODE;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]'::jsonb) INTO current_rules FROM public.pricing_rules r;
  SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.key),'[]'::jsonb) INTO current_settings FROM public.app_settings s WHERE s.key IN ('stripe_fees','min_net_result','vat_rate','fx_buffer_percent');
  IF current_rules IS DISTINCT FROM _rules_before OR current_settings IS DISTINCT FROM _settings_before THEN RAISE EXCEPTION 'price_preview_stale'; END IF;
  IF _change->>'kind' IN ('update','delete') THEN SELECT to_jsonb(r) INTO old_rule FROM public.pricing_rules r WHERE id=(_change->>'id')::uuid; END IF;
  IF _change->>'kind'='create' THEN
    INSERT INTO public.pricing_rules(id,scope,scope_ref,type,value,rounding,priority) VALUES ((_change->'rule'->>'id')::uuid,_change->'rule'->>'scope',_change->'rule'->>'scope_ref',_change->'rule'->>'type',(_change->'rule'->>'value')::numeric,_change->'rule'->>'rounding',(_change->'rule'->>'priority')::integer);
  ELSIF _change->>'kind'='update' THEN
    UPDATE public.pricing_rules SET scope=_change->'rule'->>'scope',scope_ref=_change->'rule'->>'scope_ref',type=_change->'rule'->>'type',value=(_change->'rule'->>'value')::numeric,rounding=_change->'rule'->>'rounding',priority=(_change->'rule'->>'priority')::integer WHERE id=(_change->>'id')::uuid;
  ELSIF _change->>'kind'='delete' THEN DELETE FROM public.pricing_rules WHERE id=(_change->>'id')::uuid;
  ELSIF _change->>'kind'='settings' THEN
    INSERT INTO public.app_settings(key,value,updated_at) SELECT key,value,now() FROM jsonb_each(_change->'settings') ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at;
  END IF;
  expected := jsonb_array_length(_rows);
  UPDATE public.plans p SET sell_price=x.gross,price_source=x.source,price_calculated_at=now(),price_inputs=x.inputs,price_override=x.override
  FROM jsonb_to_recordset(_rows) AS x(id uuid, gross numeric, source text, inputs jsonb, override numeric, updated_at timestamptz)
  WHERE p.id=x.id AND p.updated_at=x.updated_at;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>expected THEN RAISE EXCEPTION 'price_preview_stale'; END IF;
  INSERT INTO public.audit_log(actor_id,action,entity,meta) VALUES (_actor,'prices_recalculated','plans',jsonb_build_object('change',_change,'old_rule',old_rule,'old_settings',_settings_before,'calculated',n,'changed',(SELECT count(*) FROM jsonb_array_elements(_rows) x WHERE (x->>'old_gross')::numeric IS DISTINCT FROM (x->>'gross')::numeric)));
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.apply_price_calculation(jsonb,jsonb,jsonb,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_price_calculation(jsonb,jsonb,jsonb,jsonb,uuid) TO service_role;