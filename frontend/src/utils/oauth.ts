import { API_ENDPOINTS } from '../config/api';

declare const window: Window & {
  location: Location;
};

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

export interface OAuthProviderConfig {
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string[];
  responseType?: string;
  accessType?: 'online' | 'offline';
  prompt?: 'none' | 'consent' | 'select_account';
}

export const GOOGLE_OAUTH_CONFIG: OAuthProviderConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  redirectUri: `${window.location.origin}${API_ENDPOINTS.AUTH.GOOGLE_CALLBACK}`,
  scope: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  accessType: 'offline',
  prompt: 'consent',
};

export const MICROSOFT_OAUTH_CONFIG: OAuthProviderConfig = {
  clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  redirectUri: `${window.location.origin}${API_ENDPOINTS.AUTH.MICROSOFT_CALLBACK}`,
  scope: [
    'https://outlook.office.com/SMTP.Send',
    'openid',
    'profile',
    'email',
    'offline_access',
  ],
  responseType: 'code',
};

/**
 * Initiates the OAuth flow for the specified provider
 * @param provider The OAuth provider ('google' or 'microsoft')
 */
export const initiateOAuthFlow = (provider: 'google' | 'microsoft') => {
  const config = provider === 'google' ? GOOGLE_OAUTH_CONFIG : MICROSOFT_OAUTH_CONFIG;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    response_type: config.responseType || 'code',
    ...(config.accessType && { access_type: config.accessType }),
    ...(config.prompt && { prompt: config.prompt }),
    state: JSON.stringify({
      provider,
      redirect_uri: window.location.pathname,
    }),
  });

  // Store the current URL to redirect back after OAuth flow
  sessionStorage.setItem('pre_auth_redirect', window.location.pathname);
  
  // Redirect to OAuth provider
  window.location.href = `${config.authUrl}?${params.toString()}`;
};

/**
 * Handles the OAuth callback after user authorization
 * @param code The authorization code from the OAuth provider
 * @param provider The OAuth provider ('google' or 'microsoft')
 * @returns Promise with the token response
 */
export const handleOAuthCallback = async (code: string, provider: 'google' | 'microsoft'): Promise<OAuthTokenResponse> => {
  const config = provider === 'google' ? GOOGLE_OAUTH_CONFIG : MICROSOFT_OAUTH_CONFIG;
  
  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  // For Microsoft, we need to include the client secret in the request body
  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // Add client secret for server-side requests
  if (provider === 'microsoft' && process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_SECRET) {
    tokenParams.append('client_secret', process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_SECRET);
  }

  try {
    const response = await fetch(API_ENDPOINTS.AUTH.TOKEN, {
      method: 'POST',
      headers,
      body: tokenParams,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to authenticate');
    }

    const data: OAuthTokenResponse = await response.json();
    
    // Store tokens securely (httpOnly cookies are set by the server)
    localStorage.setItem(`${provider}_auth_state`, JSON.stringify({
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      refreshToken: data.refresh_token,
    }));

    // Redirect back to the original URL or home
    const redirectUrl = sessionStorage.getItem('pre_auth_redirect') || '/';
    sessionStorage.removeItem('pre_auth_redirect');
    window.location.href = redirectUrl;

    return data;
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw error;
  }
};

/**
 * Retrieves the current access token for the specified provider
 * @param provider The OAuth provider ('google' or 'microsoft')
 * @returns Promise with the access token or null if not available
 */
export const getAccessToken = async (provider: 'google' | 'microsoft'): Promise<string | null> => {
  const authState = localStorage.getItem(`${provider}_auth_state`);
  if (!authState) return null;

  const { accessToken, expiresAt, refreshToken } = JSON.parse(authState);
  
  // If token is still valid, return it
  if (Date.now() < expiresAt) {
    return accessToken;
  }

  // Otherwise, try to refresh the token
  if (refreshToken) {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, refresh_token: refreshToken }),
        credentials: 'include',
      });

      if (response.ok) {
        const data: OAuthTokenResponse = await response.json();
        
        // Update stored tokens
        localStorage.setItem(`${provider}_auth_state`, JSON.stringify({
          accessToken: data.access_token,
          expiresAt: Date.now() + (data.expires_in * 1000),
          refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
        }));
        
        return data.access_token;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear invalid tokens
      localStorage.removeItem(`${provider}_auth_state`);
    }
  }

  return null;
};

/**
 * Checks if the user is authenticated with the specified provider
 * @param provider The OAuth provider ('google' or 'microsoft')
 * @returns boolean indicating if the user is authenticated
 */
export const isAuthenticated = (provider: 'google' | 'microsoft'): boolean => {
  const authState = localStorage.getItem(`${provider}_auth_state`);
  if (!authState) return false;

  const { expiresAt } = JSON.parse(authState);
  return Date.now() < expiresAt;
};

/**
 * Logs out the user from the specified provider
 * @param provider The OAuth provider ('google' or 'microsoft')
 */
export const logout = (provider: 'google' | 'microsoft') => {
  localStorage.removeItem(`${provider}_auth_state`);
  
  // Redirect to provider's logout URL
  if (provider === 'google') {
    window.location.href = 'https://accounts.google.com/Logout';
  } else if (provider === 'microsoft') {
    window.location.href = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout';
  }
};
