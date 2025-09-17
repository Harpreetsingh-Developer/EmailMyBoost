import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing auth callback...')
        console.log('Current URL:', window.location.href)
        
        // Check if we have hash parameters (Supabase OAuth response)
        if (window.location.hash) {
          console.log('📝 Found hash parameters, processing OAuth callback...')
          
          // Let Supabase handle the OAuth callback from the URL hash
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('❌ Session error:', error)
            throw error
          }

          if (data.session) {
            console.log('✅ Authentication successful!')
            console.log('User:', data.session.user.email)
            console.log('Provider:', data.session.user.app_metadata?.provider)
            
            // Clear the URL hash and redirect to main app
            window.history.replaceState({}, document.title, window.location.pathname)
            navigate('/', { replace: true })
            return
          }
        }

        // Fallback: check for existing session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          console.log('✅ Found existing session, redirecting to app')
          navigate('/', { replace: true })
        } else {
          console.log('❌ No session found, redirecting to auth')
          navigate('/auth', { replace: true })
        }
      } catch (error: any) {
        console.error('❌ Auth callback error:', error)
        setError(error.message)
        // Redirect to auth page with error after 3 seconds
        setTimeout(() => {
          navigate('/auth', { replace: true })
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    // Small delay to ensure Supabase has processed the hash
    const timer = setTimeout(handleAuthCallback, 100)
    return () => clearTimeout(timer)
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto border-blue-600"></div>
          <p className="mt-4 text-gray-600">Processing Google authentication...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we complete your sign-in</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <p className="text-sm text-red-600">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback