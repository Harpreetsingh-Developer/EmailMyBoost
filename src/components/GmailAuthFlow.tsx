import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface GmailAuthFlowProps {
  onAuthComplete?: () => void;
}

export const GmailAuthFlow: React.FC<GmailAuthFlowProps> = ({ onAuthComplete }) => {
  const { 
    user, 
    hasGmailPermission, 
    gmailToken,
    canSendEmails,
    signInWithProvider, 
    requestGmailPermissions,
    testGmailConnection,
    signOut 
  } = useAuth();
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  useEffect(() => {
    if (canSendEmails && onAuthComplete) {
      onAuthComplete();
    }
  }, [canSendEmails, onAuthComplete]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithProvider('google');
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  };

  const handleRequestGmailPermissions = async () => {
    try {
      await requestGmailPermissions();
    } catch (error) {
      console.error('Gmail permissions request failed:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const isConnected = await testGmailConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign In Required</h2>
        <p className="text-gray-600 mb-6 text-center">
          Sign in with Google to send bulk emails from your Gmail account
        </p>
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    );
  }

  if (!hasGmailPermission || !gmailToken) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Gmail Permissions Required</h2>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Signed in as:</strong> {user.email}
          </p>
        </div>
        <p className="text-gray-600 mb-6 text-center">
          To send bulk emails, we need permission to access your Gmail account
        </p>
        <button
          onClick={handleRequestGmailPermissions}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg mb-4"
        >
          Grant Gmail Permissions
        </button>
        <button
          onClick={signOut}
          className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center text-green-600">✅ Ready to Send Emails!</h2>
      
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <p className="text-sm text-green-800 mb-2">
          <strong>Signed in as:</strong> {user.email}
        </p>
        <p className="text-sm text-green-800 mb-2">
          <strong>Gmail Access:</strong> ✅ Granted
        </p>
        <p className="text-sm text-green-800">
          <strong>Status:</strong> Ready for bulk email sending
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleTestConnection}
          disabled={isTestingConnection}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg"
        >
          {isTestingConnection ? 'Testing Connection...' : 'Test Gmail Connection'}
        </button>

        {connectionStatus === 'connected' && (
          <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm">
            ✅ Gmail connection successful! Ready to send emails.
          </div>
        )}

        {connectionStatus === 'failed' && (
          <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
            ❌ Gmail connection failed. You may need to re-authorize.
          </div>
        )}

        <button
          onClick={signOut}
          className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default GmailAuthFlow;