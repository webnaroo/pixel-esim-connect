import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function AdminTest({ at }: { at?: string }) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Test-E-Mail aus dem GlobeSIM-Admin</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F' }}>
        <Container style={{ padding: '32px 24px', maxWidth: '560px' }}>
          <Text style={{ color: '#0B3C49', fontSize: '20px', fontWeight: 700 }}>GlobeSIM</Text>
          <Heading>Test-E-Mail</Heading>
          <Text>Der E-Mail-Versand funktioniert. Antworte auf diese Nachricht, um die Antwortadresse zu prüfen.</Text>
          {at ? <Text>Gesendet: {at}</Text> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminTest,
  subject: 'GlobeSIM – Test-E-Mail',
  displayName: 'Test-E-Mail (Admin)',
  previewData: { at: '09.10.2026, 15:00' },
} satisfies TemplateEntry
