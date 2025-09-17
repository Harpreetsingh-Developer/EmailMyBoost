import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { initiateOAuthFlow, handleOAuthCallback, isAuthenticated, getAccessToken } from '../utils/oauth';
import { API_ENDPOINTS } from '../config/api';

type OAuthProvider = 'google' | 'microsoft';

interface UseOAuthProps {
  provider: OAuthProvider;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  autoCheck?: boolean;
}

export function useOAuth({ 
  provider, 
  onSuccess, 
  onError, 
  autoCheck = true 
}: UseOAuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check authentication status on mount and when provider changes
  useEffect(() => {
    if (autoCheck) {
      checkAuthStatus();
    }
  }, [provider, autoCheck]);

  // Handle OAuth callback when redirected back from provider
  useEffect(() => {
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    
    if (code && state) {
      try {
        const stateObj = JSON.parse(decodeURIComponent(state));
        
        if (stateObj.provider === provider) {
          const authenticate = async () => {
            try {
              setIsLoading(true);
              const data = await handleOAuthCallback(code, provider);
              setIsConnected(true);
              setAccessToken(data.access_token);
              onSuccess?.(data);
              
              // Clean up URL by removing the code and state parameters
              const cleanUrl = pathname || '/';
              window.history.replaceState({}, '', cleanUrl);
            } catch (err) {
              const error = err instanceof Error ? err : new Error('Authentication failed');
              setError(error);
              onError?.(error);
            } finally {
              setIsLoading(false);
            }
          };

          authenticate();
        }
      } catch (err) {
        console.error('Error parsing OAuth state:', err);
        setError(new Error('Invalid OAuth state'));
      }
    }
  }, [router.query, provider, onSuccess, onError]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAccessToken(provider);
      const connected = isAuthenticated(provider);
      
      setIsConnected(connected);
      setAccessToken(token);
      return { isConnected: connected, accessToken: token };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check auth status');
      setError(error);
      onError?.(error);
      return { isConnected: false, accessToken: null };
    } finally {
      setIsLoading(false);
    }
  }, [provider, onError]);

  const connect = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      initiateOAuthFlow(provider);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initiate OAuth flow');
      setError(error);
      onError?.(error);
      setIsLoading(false);
    }
  }, [provider, onError]);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Call server-side logout to revoke tokens
      await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
        credentials: 'include',
      });
      
      // Clear local state
      setIsConnected(false);
      setAccessToken(null);
      
      // Trigger a page refresh to ensure clean state
      window.location.reload();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disconnect');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [provider, onError]);

  return {
    isLoading,
    error,
    isConnected,
    accessToken,
    connect,
    disconnect,
    checkAuthStatus,
  };
}

export default useOAuth;
