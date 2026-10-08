update public.comparison_rows set enabled=false, sort_order=sort_order+100 where sort_order<=6;
with r as (
 insert into public.comparison_rows(sort_order,question,globesim_text,globesim_status,requires,enabled) values
 (1,'Hast du unbegrenztes Datenvolumen für die ganze Reise?','Unbegrenzte Daten in allen Reisezielen','check',null,true),
 (2,'Wo bleibst du verbunden?','250+ Reiseziele weltweit','check',null,true),
 (3,'Hast du immer gutes Tempo?','Schnelle, stabile Verbindung bis 5G','check',null,true),
 (4,'Hilft man dir, wenn du es brauchst?','24/7-Support in deiner Sprache, ohne Wartezeit','check',null,true),
 (5,'Ist die Installation einfach?','In wenigen Minuten bereit, ganz einfach','check',null,true),
 (6,'Was, wenn sich deine Pläne ändern?','Flexible Erstattung, ohne Aufwand','check',null,true)
 returning id, sort_order)
insert into public.comparison_facts(row_id,competitor_id,text,status,source_url,enabled)
select r.id, c.id, f.t, f.s, case when c.website_url ~ '^https://' then c.website_url else 'https://example.invalid' end, false
from r join (values
 (1,'1 GB bis 30 GB, je nach Reiseziel','cross'),
 (2,'200+ Reiseziele','cross'),
 (3,'4G/5G verfügbar, Tempo je nach Land','cross'),
 (4,'24/7-Support mit langen Wartezeiten','neutral'),
 (5,'Einfach','check'),
 (6,'Erstattung unter Bedingungen möglich','check')
) f(n,t,s) on f.n=r.sort_order cross join public.competitors c;
update public.comparison_rows set sort_order=7 where requires='unlimited_no_throttle';