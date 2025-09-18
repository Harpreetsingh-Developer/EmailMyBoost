import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthError: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to login after 5 seconds
        const timer = setTimeout(() => {
            navigate('/auth', { replace: true });
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    const provider = searchParams.get('provider');
    const error = searchParams.get('error');

    const getErrorMessage = (error: string | null) => {
        if (!error) return 'An unknown error occurred during authentication.';
        
        const commonErrors: { [key: string]: string } = {
            'access_denied': 'You denied permission to access your account.',
            'invalid_request': 'The authentication request was invalid.',
            'unauthorized_client': 'The application is not authorized to perform this action.',
            'unsupported_response_type': 'The authorization server does not support this response type.',
            'invalid_scope': 'The requested scope is invalid or unknown.',
            'server_error': 'The authorization server encountered an unexpected condition.',
            'temporarily_unavailable': 'The authorization server is temporarily overloaded or under maintenance.'
        };

        return commonErrors[error] || `Authentication error: ${error}`;
    };

    const handleRetry = () => {
        navigate('/auth', { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
                
                {provider && (
                    <p className="text-gray-600 mb-4">
                        Failed to authenticate with{' '}
                        <span className="font-semibold capitalize text-red-600">{provider}</span>
                    </p>
                )}

                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <p className="text-red-800 text-sm">
                        {getErrorMessage(error)}
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleRetry}
                        className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Try Again
                    </button>

                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Automatically redirecting in <span className="font-medium">5 seconds</span>
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-xs text-gray-400">
                    <p>Troubleshooting tips:</p>
                    <ul className="mt-2 space-y-1 text-left">
                        <li>• Ensure you're using a valid email account</li>
                        <li>• Check your internet connection</li>
                        <li>• Try using an incognito/private browser window</li>
                        <li>• Clear your browser cache and cookies</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AuthError;
