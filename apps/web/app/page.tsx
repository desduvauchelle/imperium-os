import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Root page — redirect to onboarding or dashboard based on saved mode
export default async function RootPage() {
  const cookieStore = await cookies()
  const mode = cookieStore.get('imperium:mode')?.value

  if (!mode) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}
