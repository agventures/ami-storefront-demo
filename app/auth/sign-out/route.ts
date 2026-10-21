import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOutAccount } from '@/lib/ami'
import { CUSTOMER_COOKIE, customerToken } from '@/lib/customer'

// «Cerrar sesión». A POST, so a link or a picture on another site cannot sign
// anybody out. Ami signs the browser out everywhere: this site, the Ami
// account and the Ami stores it had signed in to.
export async function POST() {
  const token = await customerToken()
  if (token) {
    await signOutAccount(token).catch((error: unknown) => {
      console.error('[auth] could not sign out on Ami', error)
    })
  }
  ;(await cookies()).delete(CUSTOMER_COOKIE)
  redirect('/')
}
