import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function UsageAlert({ threshold, plan, orderUrl }: { threshold?: number; plan?: string; orderUrl?: string }) {
  const full = (threshold ?? 0) >= 100
  return (
    <Html lang="de">
      <Head />
      <Preview>{full ? 'Dein Datenvolumen ist aufgebraucht.' : `Du hast ${threshold ?? 80} % deines Datenvolumens verbraucht.`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading>{full ? 'Datenvolumen aufgebraucht' : `${threshold ?? 80} % verbraucht`}</Heading>
          <Text>{full ? 'Das Datenvolumen deiner eSIM ist aufgebraucht.' : `Du hast ${threshold ?? 80} % des Datenvolumens deiner eSIM verbraucht.`}</Text>
          {plan ? <Text>Tarif: {plan}</Text> : null}
          {orderUrl ? <Button href={orderUrl} style={{ backgroundColor: '#0B3C49', color: '#ffffff', padding: '14px 22px', borderRadius: '10px', fontWeight: 700 }}>Verbrauch ansehen</Button> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: UsageAlert,
  subject: (d: Record<string, any>) => (Number(d['threshold']) >= 100 ? 'GlobeSIM – Dein Datenvolumen ist aufgebraucht' : `GlobeSIM – ${Number(d['threshold']) || 80} % deines Datenvolumens verbraucht`),
  displayName: 'Verbrauchshinweis (80 % / 100 %)',
  previewData: { threshold: 80, plan: 'Türkei · 5 GB · 30 Tage', orderUrl: 'https://globesim.de/order/vorschau?t=signiert' },
} satisfies TemplateEntry
