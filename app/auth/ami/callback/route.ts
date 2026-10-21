import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { redeemSignIn } from '@/lib/ami'
import { CUSTOMER_COOKIE, VERIFIER_COOKIE, customerCookie, safeNext } from '@/lib/customer'

// «Entrar con Ami», step 2: the browser is back with `?code=` (or with
// `?error=access_denied` when the customer chose not to). The code and the
// verifier become the customer's token, kept in an httpOnly cookie.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const next = safeNext(params.get('next'))
  const jar = await cookies()
  const verifier = jar.get(VERIFIER_COOKIE)?.value
  jar.delete({ name: VERIFIER_COOKIE, path: '/auth/ami' })
  const code = params.get('code')
  if (!code || !verifier) redirect(next)

  let token: string
  try {
    token = (await redeemSignIn(code, verifier)).token
  } catch (error) {
    console.error('[auth] the sign-in could not be redeemed', error)
    redirect(`${next}${next.includes('?') ? '&' : '?'}entrar=otra-vez`)
  }
  jar.set(CUSTOMER_COOKIE, token, customerCookie)
  redirect(next)
}
