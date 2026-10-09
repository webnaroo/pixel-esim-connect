import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, p } from './auth-layout'
export const ReauthenticationEmail = ({ token }: { token: string }) => (
  <AuthLayout preview="Dein Bestätigungscode für GlobeSIM." title="Bestätigungscode">
    <Text style={p}>Gib diesen Code ein, um die Aktion zu bestätigen:</Text>
    <Text style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '4px', color: '#0B3C49', margin: '0 0 18px' }}>{token}</Text>
    <Text style={p}>Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</Text>
  </AuthLayout>
)
export default ReauthenticationEmail
