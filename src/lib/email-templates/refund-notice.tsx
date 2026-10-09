import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function RefundNotice({ orderId }: { orderId?: string }) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Wir konnten deine eSIM nicht bereitstellen, dein Geld ist unterwegs.</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading>Dein Geld ist unterwegs</Heading>
          <Text>Wir konnten deine eSIM nicht bereitstellen, dein Geld ist unterwegs.</Text>
          <Text>Wir haben den vollen Betrag auf dein ursprüngliches Zahlungsmittel erstattet. Je nach Bank kann die Gutschrift einige Tage dauern.</Text>
          {orderId ? <Text>Bestellnummer: {orderId}</Text> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RefundNotice,
  subject: 'GlobeSIM – Wir konnten deine eSIM nicht bereitstellen, dein Geld ist unterwegs',
  displayName: 'Automatische Erstattung',
  previewData: { orderId: 'Vorschau' },
} satisfies TemplateEntry
