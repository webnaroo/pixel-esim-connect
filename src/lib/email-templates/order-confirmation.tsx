import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function OrderConfirmation({ orderId }: { orderId?: string }) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Deine Bestellung bei GlobeSIM ist eingegangen.</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading>Bestellung eingegangen</Heading>
          <Text>Vielen Dank für deine Bestellung bei GlobeSIM.</Text>
          {orderId ? <Text>Bestellnummer: {orderId}</Text> : null}
          <Text>Diese Nachricht bestätigt den Eingang deiner Bestellung, nicht die Zahlung oder Bereitstellung deiner eSIM.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderConfirmation,
  subject: 'GlobeSIM – Bestellung eingegangen',
  displayName: 'Bestelleingang',
  previewData: { orderId: 'Vorschau' },
} satisfies TemplateEntry