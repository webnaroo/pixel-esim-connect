import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, p } from './auth-layout'
export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: { siteName: string; oldEmail: string; email: string; newEmail: string; confirmationUrl: string }) => (
  <AuthLayout preview="Bestätige deine neue E-Mail-Adresse für GlobeSIM." title="Neue E-Mail-Adresse bestätigen" cta={{ href: confirmationUrl, label: 'Änderung bestätigen' }}>
    <Text style={p}>Du möchtest deine E-Mail-Adresse von {oldEmail} auf {newEmail} ändern. Bitte bestätige die Änderung.</Text>
    <Text style={p}>Wenn du das nicht warst, sichere bitte sofort dein Konto und schreib uns.</Text>
  </AuthLayout>
)
export default EmailChangeEmail
