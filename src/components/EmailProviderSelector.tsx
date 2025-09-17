import { useState, useEffect } from 'react';
import { Mail, Server, ChevronDown } from 'lucide-react';

export type EmailProvider = 'smtp' | 'gmail' | 'microsoft';

interface EmailProviderSelectorProps {
  selectedProvider: EmailProvider;
  onProviderChange: (provider: EmailProvider) => void;
  className?: string;
}

const providerConfigs = {
  smtp: {
    name: 'Custom SMTP',
    icon: Server,
    description: 'Use your own SMTP server',
  },
  gmail: {
    name: 'Gmail',
    icon: Mail,
    description: 'Send emails using Gmail OAuth',
  },
  microsoft: {
    name: 'Microsoft 365',
    icon: Mail,
    description: 'Send emails using Microsoft 365 OAuth',
  },
};

export function EmailProviderSelector({
  selectedProvider,
  onProviderChange,
  className = '',
}: EmailProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleSelect = (provider: EmailProvider) => {
    onProviderChange(provider);
    setIsOpen(false);
  };

  if (!isMounted) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-10 w-full ${className}`} />
    );
  }

  const currentProvider = providerConfigs[selectedProvider];
  const Icon = currentProvider.icon;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white">{currentProvider.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentProvider.description}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`ml-2 h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg">
            <ul
              tabIndex={-1}
              role="listbox"
              aria-labelledby="email-provider-selector"
              className="py-1 max-h-60 rounded-md text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
            >
              {Object.entries(providerConfigs).map(([key, { name, icon: ProviderIcon, description }]) => (
                <li
                  key={key}
                  role="option"
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedProvider === key ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                  onClick={() => handleSelect(key as EmailProvider)}
                >
                  <div className="flex items-center">
                    <ProviderIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                    </div>
                  </div>
                  {selectedProvider === key && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default EmailProviderSelector;
