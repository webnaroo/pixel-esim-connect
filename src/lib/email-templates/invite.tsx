import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, p } from './auth-layout'
export const InviteEmail = ({ confirmationUrl }: { siteName: string; siteUrl: string; confirmationUrl: string }) => (
  <AuthLayout preview="Du wurdest zu GlobeSIM eingeladen." title="Einladung zu GlobeSIM" cta={{ href: confirmationUrl, label: 'Einladung annehmen' }}>
    <Text style={p}>Du wurdest eingeladen, ein Konto bei GlobeSIM anzulegen. Mit dem Knopf unten nimmst du die Einladung an.</Text>
    <Text style={p}>Wenn du keine Einladung erwartet hast, ignoriere diese E-Mail.</Text>
  </AuthLayout>
)
export default InviteEmail
