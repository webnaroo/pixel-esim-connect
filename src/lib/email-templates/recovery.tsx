import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, p } from './auth-layout'
export const RecoveryEmail = ({ confirmationUrl }: { siteName: string; confirmationUrl: string }) => (
  <AuthLayout preview="Setze dein GlobeSIM-Passwort zurück." title="Passwort zurücksetzen" cta={{ href: confirmationUrl, label: 'Neues Passwort festlegen' }}>
    <Text style={p}>Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Mit dem Knopf unten legst du ein neues Passwort fest.</Text>
    <Text style={p}>Wenn du das nicht angefordert hast, ignoriere diese E-Mail. Dein Passwort bleibt unverändert.</Text>
  </AuthLayout>
)
export default RecoveryEmail
