import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { startSignIn } from '@/lib/ami'
import { VERIFIER_COOKIE, safeNext } from '@/lib/customer'
import { siteUrl } from '@/lib/site'

// «Entrar con Ami», step 1: ask Ami for a sign-in, keep the verifier, and send
// the browser to Ami's page. It comes back to /auth/ami/callback.
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get('next'))
  const callback = `${siteUrl()}/auth/ami/callback?next=${encodeURIComponent(next)}`
  const { url, verifier } = await startSignIn(callback)
  ;(await cookies()).set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth/ami',
    maxAge: 15 * 60,
  })
  redirect(url)
}
