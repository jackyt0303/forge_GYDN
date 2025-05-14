import { createContext, useContext } from 'react';

// Create Context
export const AppContext = createContext();

// a custom hook for context accessing from global 
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside an AppContext.Provider');
  }
  return context;
}
