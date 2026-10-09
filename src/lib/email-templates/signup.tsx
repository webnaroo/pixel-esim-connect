import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, p } from './auth-layout'
export const SignupEmail = ({ recipient, confirmationUrl }: { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }) => (
  <AuthLayout preview="Bitte bestätige deine E-Mail-Adresse für GlobeSIM." title="E-Mail-Adresse bestätigen" cta={{ href: confirmationUrl, label: 'E-Mail-Adresse bestätigen' }}>
    <Text style={p}>Du hast ein Konto bei GlobeSIM angelegt. Bitte bestätige deine Adresse {recipient} mit dem Knopf unten.</Text>
    <Text style={p}>Wenn du kein Konto angelegt hast, kannst du diese E-Mail ignorieren.</Text>
  </AuthLayout>
)
export default SignupEmail
