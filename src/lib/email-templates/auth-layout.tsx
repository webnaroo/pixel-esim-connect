import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Text } from '@react-email/components'

// GlobeSIM auth mail layout: cream/navy, logo, German, factual, support hint.
const LOGO = 'https://globesim.de/__l5e/assets-v1/315cc6d3-c5ee-45d1-b200-403700923f20/globesim-logo.png'
export function AuthLayout({ preview, title, children, cta }: { preview: string; title: string; children: React.ReactNode; cta?: { href: string; label: string } }) {
  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111A1F', margin: 0 }}>
        <Container style={{ backgroundColor: '#F6F3EE', borderRadius: '14px', padding: '28px 24px', maxWidth: '560px', margin: '24px auto' }}>
          <Img src={LOGO} alt="GlobeSIM" height="32" style={{ height: '32px', width: 'auto', marginBottom: '20px' }} />
          <Heading style={{ fontSize: '22px', color: '#0B3C49', margin: '0 0 16px' }}>{title}</Heading>
          {children}
          {cta ? <Button href={cta.href} style={{ backgroundColor: '#0B3C49', color: '#ffffff', padding: '14px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>{cta.label}</Button> : null}
          <Text style={{ fontSize: '12px', color: '#5B6770', marginTop: '28px' }}>Fragen? Schreib uns an support@globesim.de.</Text>
        </Container>
      </Body>
    </Html>
  )
}
export const p = { fontSize: '15px', lineHeight: '1.5', margin: '0 0 18px' }
