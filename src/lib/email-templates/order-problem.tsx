import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function OrderProblem({ orderId }: { orderId?: string }) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Bei der Bereitstellung deiner eSIM gab es ein Problem.</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading>Deine eSIM konnte nicht bereitgestellt werden</Heading>
          <Text>Bei der Bereitstellung deiner eSIM ist ein Problem aufgetreten. Wir kümmern uns darum und melden uns bei dir. Falls wir die eSIM nicht liefern können, erstatten wir dir den vollen Betrag.</Text>
          {orderId ? <Text>Bestellnummer: {orderId}</Text> : null}
          <Text>Fragen? Antworte einfach auf diese E-Mail.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderProblem,
  subject: 'GlobeSIM – Problem bei deiner Bestellung',
  displayName: 'Problem bei der Bereitstellung',
  previewData: { orderId: 'Vorschau' },
} satisfies TemplateEntry
