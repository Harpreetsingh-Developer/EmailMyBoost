import { forwardRef } from 'react';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className = '', ...props }, ref) => {
    return (
      <div className={`flex items-start ${className}`}>
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              ref={ref}
              {...props}
            />
            <div
              className={`block w-10 h-6 rounded-full transition-colors ${
                props.checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            ></div>
            <div
              className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                props.checked ? 'transform translate-x-4' : ''
              }`}
            ></div>
          </div>
        </div>
        <div className="ml-3 text-sm">
          <label className="font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          {description && (
            <p className="text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
