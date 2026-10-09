import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { orderId?: string; plan?: string; total?: string; customer?: string; url?: string }

function AdminNewOrder({ orderId, plan, total, customer, url }: Props) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Neue bezahlte Bestellung bei GlobeSIM</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading style={{ fontSize: '22px' }}>Neue Bestellung bezahlt</Heading>
          <Text>Bestellung Nr. {orderId ?? '–'} wurde soeben bezahlt.</Text>
          {plan ? <Text>Tarif: {plan}</Text> : null}
          {total ? <Text>Betrag: {total}</Text> : null}
          {customer ? <Text>Kunde: {customer}</Text> : null}
          {url ? <Button href={url} style={{ backgroundColor: '#0B3C49', color: '#ffffff', padding: '12px 20px', borderRadius: '8px' }}>Im Admin ansehen</Button> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminNewOrder,
  subject: (d: Record<string, any>) => `Neue Bestellung: Nr. ${d['orderId'] ?? ''}`,
  displayName: 'Neue Bestellung (Admin)',
  previewData: { orderId: 'c7e829b5', plan: 'Türkei · 1 GB · 7 Tage', total: '1,99 €', customer: 'kunde@example.de', url: 'https://globesim.de/admin/orders' },
} satisfies TemplateEntry
