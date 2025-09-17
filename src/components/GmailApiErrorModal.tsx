import React from 'react';
import { AlertTriangle, ExternalLink, X, RefreshCw, LogOut } from 'lucide-react';

interface GmailApiError {
  needsApiSetup: boolean;
  projectId?: string;
  setupUrl?: string;
  errorType: string;
  message: string;
  instructions: string;
}

interface GmailApiErrorModalProps {
  error: GmailApiError;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onSignOut?: () => void;
}

const GmailApiErrorModal: React.FC<GmailApiErrorModalProps> = ({
  error,
  isOpen,
  onClose,
  onRetry,
  onSignOut
}) => {
  if (!isOpen) return null;

  const getErrorIcon = () => {
    switch (error.errorType) {
      case 'gmail_api_not_enabled':
        return <AlertTriangle className="w-12 h-12 text-orange-500" />;
      case 'auth_error':
      case 'insufficient_permissions':
        return <LogOut className="w-12 h-12 text-red-500" />;
      case 'quota_exceeded':
        return <RefreshCw className="w-12 h-12 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-red-500" />;
    }
  };

  const getErrorColor = () => {
    switch (error.errorType) {
      case 'gmail_api_not_enabled':
        return 'border-orange-200 bg-orange-50';
      case 'auth_error':
      case 'insufficient_permissions':
        return 'border-red-200 bg-red-50';
      case 'quota_exceeded':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Gmail Setup Required
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`rounded-lg border-2 p-4 mb-6 ${getErrorColor()}`}>
            <div className="flex items-start space-x-4">
              {getErrorIcon()}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {error.message}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {error.instructions}
                </p>
              </div>
            </div>
          </div>

          {/* Gmail API Setup Instructions */}
          {error.needsApiSetup && error.setupUrl && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">
                Quick Setup Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Click the "Enable Gmail API" button below</li>
                <li>Sign in to Google Cloud Console if prompted</li>
                <li>Click "Enable" on the Gmail API page</li>
                <li>Wait 2-3 minutes for the API to activate</li>
                <li>Come back and try sending emails again</li>
              </ol>
            </div>
          )}

          {/* Project ID Info */}
          {error.projectId && (
            <div className="mb-6 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Project ID:</strong> {error.projectId}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t bg-gray-50">
          {error.needsApiSetup && error.setupUrl && (
            <a
              href={error.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Enable Gmail API
            </a>
          )}
          
          {(error.errorType === 'auth_error' || error.errorType === 'insufficient_permissions') && onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out & Reconnect
            </button>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          )}
          
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GmailApiErrorModal;