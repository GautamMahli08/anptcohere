import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UiScope } from '@/types/lifecycle';

interface UiScopeContextType {
  scope: UiScope;
  setRetailOnly: (retailOnly: boolean) => void;
  setClientId: (clientId: string | undefined) => void;
}

const UiScopeContext = createContext<UiScopeContextType | undefined>(undefined);

export const UiScopeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scope, setScope] = useState<UiScope>({
    retailOnly: false,
    clientId: undefined,
  });

  const setRetailOnly = (retailOnly: boolean) => {
    setScope(prev => ({ ...prev, retailOnly }));
  };

  const setClientId = (clientId: string | undefined) => {
    setScope(prev => ({ ...prev, clientId }));
  };

  return (
    <UiScopeContext.Provider value={{ scope, setRetailOnly, setClientId }}>
      {children}
    </UiScopeContext.Provider>
  );
};

export const useUiScope = () => {
  const context = useContext(UiScopeContext);
  if (context === undefined) {
    throw new Error('useUiScope must be used within a UiScopeProvider');
  }
  return context;
};