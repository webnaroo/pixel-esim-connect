import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { orderId?: string; customer?: string; reason?: string; url?: string }

function AdminRefundRequest({ orderId, customer, reason, url }: Props) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Neue Erstattungsanfrage – bitte prüfen</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading style={{ fontSize: '22px' }}>Erstattungsanfrage offen</Heading>
          <Text>Ein Kunde hat für Bestellung Nr. {orderId ?? '–'} eine Erstattung beantragt.</Text>
          {customer ? <Text>Kunde: {customer}</Text> : null}
          {reason ? <Text>Grund: {reason}</Text> : null}
          <Text>Das Geld geht erst zurück, wenn du die Anfrage im Admin freigibst.</Text>
          {url ? <Button href={url} style={{ backgroundColor: '#0B3C49', color: '#ffffff', padding: '12px 20px', borderRadius: '8px' }}>Im Admin ansehen</Button> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminRefundRequest,
  subject: (d: Record<string, any>) => `Erstattungsanfrage offen: Nr. ${d.orderId ?? ''}`,
  displayName: 'Erstattungsanfrage (Admin)',
  previewData: { orderId: 'c7e829b5', customer: 'kunde@example.de', reason: 'Reise abgesagt', url: 'https://globesim.de/admin' },
} satisfies TemplateEntry
