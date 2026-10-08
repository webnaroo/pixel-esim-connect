INSERT INTO public.comparison_facts (row_id, competitor_id, text, status, source_url, checked_at, enabled)
SELECT r.id, c.id, v.t, v.s, 'https://lp.esim.holafly.com', DATE '2026-10-08', true
FROM (VALUES
 (1, 'Tarife von 1 GB bis 30 GB, je nach Reiseziel', 'cross'),
 (2, '200+ Reiseziele', 'cross'),
 (3, '4G/5G verfügbar, aber Tempo variiert je nach Land', 'cross'),
 (4, '24/7-Support mit langen Wartezeiten', 'neutral'),
 (5, 'Einfach', 'check'),
 (6, 'Erstattung unter Bedingungen möglich', 'check')
) AS v(o, t, s)
JOIN public.comparison_rows r ON r.sort_order = v.o
JOIN public.competitors c ON c.slug = 'airalo'
ON CONFLICT (row_id, competitor_id) DO UPDATE SET text = EXCLUDED.text, status = EXCLUDED.status, source_url = EXCLUDED.source_url, checked_at = EXCLUDED.checked_at, enabled = true;