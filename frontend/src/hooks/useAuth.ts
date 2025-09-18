import { useState, useEffect } from 'react'
import { User, Session, Provider } from '@supabase/supabase-js'
import { supabase } from '../config/supabase'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  hasGmailPermission: boolean
  gmailToken: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    hasGmailPermission: false,
    gmailToken: null
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
      }

      // Check if user has Gmail permissions
      const hasGmailPermission = checkGmailPermission(session)
      const gmailToken = extractGmailToken(session)

      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
        hasGmailPermission,
        gmailToken
      })
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        // Check Gmail permissions on auth change
        const hasGmailPermission = checkGmailPermission(session)
        const gmailToken = extractGmailToken(session)

        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          hasGmailPermission,
          gmailToken
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Helper function to check if user has Gmail permissions
  const checkGmailPermission = (session: Session | null): boolean => {
    console.log('🔍 Checking Gmail permission:', {
      hasSession: !!session,
      hasProviderToken: !!session?.provider_token,
      provider: session?.user?.app_metadata?.provider,
      providerTokenStart: session?.provider_token?.substring(0, 20) + '...' || 'none'
    });
    
    if (!session?.provider_token) return false
    
    // Check if the session includes Gmail scope
    const user = session.user
    const provider = user?.app_metadata?.provider
    
    return provider === 'google' && !!session.provider_token
  }

  // Helper function to extract Gmail access token
  const extractGmailToken = (session: Session | null): string | null => {
    return session?.provider_token || null
  }

  // Request Gmail permissions specifically
  const requestGmailPermissions = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email profile https://www.googleapis.com/auth/gmail.send',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    
    if (error) throw error
    return data
  }

  // Test Gmail API connection
  const testGmailConnection = async (): Promise<boolean> => {
    if (!authState.gmailToken) return false
    
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${authState.gmailToken}`
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('Gmail connection test failed:', error)
      return false
    }
  }

  // Start bulk email sending with progress tracking
  const sendBulkEmails = async (emailData: {
    recipients: Array<{email: string, [key: string]: any}>
    subject: string
    content: string
    cc?: string
    bcc?: string
  }, onProgress?: (progress: {sent: number, total: number, current: string, percentage: number, gmailApiError?: any}) => void) => {
    if (!authState.session?.access_token) {
      throw new Error('No authentication token available')
    }

    if (!authState.gmailToken) {
      throw new Error('Gmail permissions required')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authState.session.access_token}`
    }

    // Add provider token if available
    if (authState.gmailToken) {
      headers['X-Provider-Token'] = authState.gmailToken
    }

    // Start the bulk email job
    const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/supabase/send-bulk-email/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const error = await response.json()
      // Check for Gmail API errors
      if (error.gmailApiError) {
        const gmailError = new Error(error.error || 'Gmail API error')
        ;(gmailError as any).gmailApiError = error.gmailApiError
        throw gmailError
      }
      throw new Error(error.error || 'Failed to start email sending')
    }

    const startData = await response.json()
    const jobId = startData.jobId

    // If no progress callback provided, return the job info
    if (!onProgress) {
      return { jobId, total: startData.total }
    }

    // Poll for progress updates
    return new Promise((resolve, reject) => {
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(`${import.meta.env.VITE_BASE_API}/api/supabase/send-bulk-email/progress/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${authState.session?.access_token}`
            }
          })

          if (!progressResponse.ok) {
            throw new Error('Failed to get progress')
          }

          const progressData = await progressResponse.json()
          
          if (progressData.success) {
            const progress = progressData.progress
            
            onProgress({
              sent: progress.sent,
              total: progress.total,
              current: progress.current || '',
              percentage: progress.percentage,
              gmailApiError: progress.gmailApiError
            })

            if (progress.status === 'completed') {
              resolve({
                success: true,
                summary: {
                  total: progress.total,
                  sent: progress.sent,
                  failed: progress.failed
                },
                results: progress.results
              })
            } else if (progress.status === 'failed') {
              const error = new Error(progress.error || 'Email sending failed')
              if (progress.gmailApiError) {
                ;(error as any).gmailApiError = progress.gmailApiError
              }
              reject(error)
            } else if (progress.status === 'sending') {
              // Continue polling with shorter interval for more responsive updates
              setTimeout(pollProgress, 1000)
            }
          } else {
            reject(new Error(progressData.error || 'Failed to get progress'))
          }
        } catch (err: any) {
          reject(err)
        }
      }

      // Start polling after a short delay
      setTimeout(pollProgress, 1000)
    })
  }

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) throw error
    return data
  }

  // Sign in with OAuth provider
  const signInWithProvider = async (provider: Provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'google' ? 'email profile https://www.googleapis.com/auth/gmail.send' : undefined,
        queryParams: provider === 'google' ? {
          access_type: 'offline',
          prompt: 'consent'
        } : undefined
      }
    })

    if (error) throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Reset password
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) throw error
    return data
  }

  // Update password
  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password
    })

    if (error) throw error
    return data
  }

  return {
    ...authState,
    signInWithEmail,
    signUpWithEmail,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    requestGmailPermissions,
    testGmailConnection,
    sendBulkEmails,
    isAuthenticated: !!authState.user,
    canSendEmails: authState.hasGmailPermission && !!authState.gmailToken
  }
}