import type { Liff } from '@line/liff'

// Lazy load LIFF to avoid initialization issues
let liffInstance: Liff | null = null
let initPromise: Promise<boolean> | null = null
let isInitialized = false
let initAttempted = false

const liffId = import.meta.env.VITE_LIFF_ID

export async function initLiff(): Promise<boolean> {
  // Prevent duplicate initialization attempts
  if (isInitialized) {
    console.log('✅ LIFF already initialized')
    return true
  }

  // Return existing promise if initialization is in progress
  if (initPromise) {
    console.log('⏳ LIFF initialization in progress...')
    return initPromise
  }

  // Check if LIFF ID is configured
  if (!liffId || liffId === 'your-liff-id') {
    console.log('⚠️ LIFF not configured (missing VITE_LIFF_ID)')
    return false
  }

  // Create initialization promise
  initPromise = initializeLiffInternal()
  return initPromise
}

async function initializeLiffInternal(): Promise<boolean> {
  if (initAttempted) {
    return isInitialized
  }

  initAttempted = true

  try {
    // Dynamic import to avoid SSR issues
    const liffModule = await import('@line/liff')
    liffInstance = liffModule.default

    await liffInstance.init({ liffId })
    isInitialized = true
    console.log('✅ LIFF initialized successfully')
    return true
  } catch (error) {
    console.warn('⚠️ LIFF initialization failed:', error)
    isInitialized = false
    return false
  }
}

export function isLiffInitialized(): boolean {
  return isInitialized
}

export function getLiffInstance(): Liff | null {
  return liffInstance
}

export function isInLineApp(): boolean {
  if (!isInitialized || !liffInstance) return false
  try {
    return liffInstance.isInClient()
  } catch {
    return false
  }
}

export function isLiffLoggedIn(): boolean {
  if (!isInitialized || !liffInstance) return false
  try {
    return liffInstance.isLoggedIn()
  } catch {
    return false
  }
}

export async function loginWithLine(): Promise<void> {
  const success = await initLiff()
  if (!success || !liffInstance) {
    throw new Error('LIFF not initialized')
  }

  if (!liffInstance.isLoggedIn()) {
    liffInstance.login({ redirectUri: window.location.href })
  }
}

export async function logoutFromLine(): Promise<void> {
  if (!isInitialized || !liffInstance) return

  try {
    if (liffInstance.isLoggedIn()) {
      liffInstance.logout()
    }
  } catch (e) {
    console.warn('LIFF logout warning:', e)
  }

  // Reset state
  isInitialized = false
  initAttempted = false
  initPromise = null
  liffInstance = null
}

export async function getLineProfile(): Promise<{
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
} | null> {
  if (!isInitialized || !liffInstance) {
    console.log('⚠️ Cannot get profile: LIFF not initialized')
    return null
  }

  try {
    if (!liffInstance.isLoggedIn()) {
      console.log('⚠️ Cannot get profile: User not logged in')
      return null
    }
    const profile = await liffInstance.getProfile()
    console.log('👤 Got LINE profile:', profile.displayName)
    return profile
  } catch (error) {
    console.error('❌ Failed to get LINE profile:', error)
    return null
  }
}

export function getLineAccessToken(): string | null {
  if (!isInitialized || !liffInstance) return null
  try {
    return liffInstance.getAccessToken()
  } catch {
    return null
  }
}

export async function shareToLine(message: string): Promise<void> {
  const success = await initLiff()
  if (!success || !liffInstance) {
    throw new Error('LIFF not initialized')
  }

  if (!liffInstance.isInClient()) {
    // Fallback for external browser
    const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
      window.location.href
    )}&text=${encodeURIComponent(message)}`
    window.open(lineShareUrl, '_blank')
    return
  }

  await liffInstance.shareTargetPicker(
    [{ type: 'text', text: message }],
    { isMultiple: false }
  )
}

export function closeLiffWindow(): void {
  if (!isInitialized || !liffInstance) return
  try {
    liffInstance.closeWindow()
  } catch {
    // Ignore error
  }
}

export function getLiffLanguage(): string {
  if (!isInitialized || !liffInstance) return 'th'
  try {
    return liffInstance.getLanguage() || 'th'
  } catch {
    return 'th'
  }
}

export function getLiffOS(): 'ios' | 'android' | 'web' {
  if (!isInitialized || !liffInstance) return 'web'
  try {
    const context = liffInstance.getContext() as { os?: 'ios' | 'android' | 'web' } | null
    return context?.os || 'web'
  } catch {
    return 'web'
  }
}
