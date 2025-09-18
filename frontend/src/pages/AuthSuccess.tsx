import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { emailService } from '../utils/oauth2EmailService';

const AuthSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const provider = searchParams.get('provider');

        if (token && provider) {
            // Store the token using the email service
            emailService.setToken(token);
            
            // Redirect to main app after a short delay
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        } else {
            // If no token, redirect to login
            setTimeout(() => {
                navigate('/auth', { replace: true });
            }, 3000);
        }
    }, [searchParams, navigate]);

    const token = searchParams.get('token');
    const provider = searchParams.get('provider');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                {token && provider ? (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-green-100 rounded-full">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Successful!</h2>
                        <p className="text-gray-600 mb-4">
                            You have successfully signed in with{' '}
                            <span className="font-semibold capitalize text-blue-600">{provider}</span>
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                            <p className="text-green-800 text-sm">
                                ✅ OAuth2 authentication complete<br/>
                                ✅ Access token received<br/>
                                ✅ Email sending permissions granted
                            </p>
                        </div>
                        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                        <div className="mt-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
                        <p className="text-gray-600 mb-4">
                            No authentication token received. Please try signing in again.
                        </p>
                        <p className="text-sm text-gray-500">Redirecting to login page...</p>
                        <div className="mt-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthSuccess;
