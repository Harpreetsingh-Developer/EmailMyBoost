import { createContext, useContext, useState, ReactNode } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const Tabs = ({
  children,
  defaultValue,
  className = '',
}: {
  children: ReactNode;
  defaultValue: string;
  className?: string;
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`flex border-b border-gray-200 dark:border-gray-700 ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
};

export const TabsTrigger = ({
  value,
  children,
  disabled = false,
  className = '',
}: {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }
  const { activeTab, setActiveTab } = context;

  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === value
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }
  const { activeTab } = context;

  return activeTab === value ? (
    <div className={`mt-2 ${className}`} role="tabpanel">
      {children}
    </div>
  ) : null;
};
