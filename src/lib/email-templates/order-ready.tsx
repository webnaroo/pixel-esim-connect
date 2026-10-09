import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

// Never contains activation codes, LPA or QR — only the signed installation link.
function OrderReady({ orderId, plan, installUrl }: { orderId?: string; plan?: string; installUrl?: string }) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Deine eSIM ist bereit – jetzt installieren.</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading>Deine eSIM ist bereit</Heading>
          <Text>Vielen Dank für deine Bestellung. Deine eSIM wurde erstellt und kann installiert werden.</Text>
          {plan ? <Text>Tarif: {plan}</Text> : null}
          {orderId ? <Text>Bestellnummer: {orderId}</Text> : null}
          {installUrl ? (
            <Button href={installUrl} style={{ backgroundColor: '#0B3C49', color: '#ffffff', padding: '14px 22px', borderRadius: '10px', fontWeight: 700 }}>
              eSIM jetzt installieren
            </Button>
          ) : null}
          <Text>Der Link ist persönlich und 30 Tage gültig. Gib ihn nicht weiter. Installiere die eSIM am besten vor der Reise mit WLAN.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderReady,
  subject: 'GlobeSIM – Deine eSIM ist bereit',
  displayName: 'Bestellbestätigung mit Installationslink',
  previewData: { orderId: 'Vorschau', plan: 'Türkei · 5 GB · 30 Tage', installUrl: 'https://globesim.de/install/vorschau?t=signiert' },
} satisfies TemplateEntry
