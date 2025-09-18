import { supabase } from '../config/supabase'
import { getApiUrl } from '../config/api'

interface SendEmailParams {
  to: string
  cc?: string
  bcc?: string
  subject: string
  html: string
  attachments?: File[]
}

/**
 * Send email using Supabase authentication and backend API
 */
export async function sendEmailWithSupabase(params: SendEmailParams) {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      throw new Error('User not authenticated')
    }

    // Get the JWT token from Supabase
    const token = session.access_token
    const user = session.user

    // Prepare form data
    const formData = new FormData()
    formData.append('to', params.to)
    if (params.cc?.trim()) formData.append('cc', params.cc.trim())
    if (params.bcc?.trim()) formData.append('bcc', params.bcc.trim())
    formData.append('subject', params.subject)
    formData.append('html', params.html)
    formData.append('senderEmail', user.email || '')
    
    // Add user provider info for backend routing
    const provider = user.app_metadata?.provider || 'email'
    formData.append('provider', provider === 'google' ? 'google' : 'microsoft')
    
    // Add attachments
    if (params.attachments) {
      params.attachments.forEach((file) => {
        formData.append('attachments', file)
      })
    }

    // Send to backend API with Supabase JWT token
    const response = await fetch(`${getApiUrl()}/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Server error: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Email sending failed')
    }

    return {
      success: true,
      messageId: result.messageId,
      provider: result.provider
    }

  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get user's email provider from Supabase session
 */
export async function getUserEmailProvider(): Promise<'google' | 'microsoft' | 'email' | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return null
    }

    const provider = session.user.app_metadata?.provider
    
    if (provider === 'google') return 'google'
    if (provider === 'microsoft') return 'microsoft'
    return 'email'
    
  } catch (error) {
    console.error('Error getting user provider:', error)
    return null
  }
}

/**
 * Check if user can send emails (has valid OAuth tokens)
 */
export async function canSendEmails(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return false
    }

    const provider = session.user.app_metadata?.provider
    
    // OAuth users (Google/Microsoft) can send emails
    if (provider === 'google' || provider === 'microsoft') {
      return true
    }

    // Email/password users need additional setup
    // This would require backend integration to check if they have app passwords
    return false
    
  } catch (error) {
    console.error('Error checking email capability:', error)
    return false
  }
}

export default {
  sendEmailWithSupabase,
  getUserEmailProvider,
  canSendEmails
}