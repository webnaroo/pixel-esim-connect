import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, p } from './auth-layout'
export const MagicLinkEmail = ({ confirmationUrl }: { siteName: string; confirmationUrl: string }) => (
  <AuthLayout preview="Dein Anmeldelink für GlobeSIM." title="Dein Anmeldelink" cta={{ href: confirmationUrl, label: 'Jetzt anmelden' }}>
    <Text style={p}>Mit dem Knopf unten meldest du dich bei GlobeSIM an. Der Link ist nur kurz gültig.</Text>
    <Text style={p}>Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</Text>
  </AuthLayout>
)
export default MagicLinkEmail
