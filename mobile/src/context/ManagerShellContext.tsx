import React, { createContext, useContext } from 'react';

interface ManagerShellContextValue {
  openMenu: () => void;
}

const ManagerShellContext = createContext<ManagerShellContextValue | undefined>(undefined);

export function ManagerShellProvider({
  children,
  openMenu,
}: {
  children: React.ReactNode;
  openMenu: () => void;
}) {
  return (
    <ManagerShellContext.Provider value={{ openMenu }}>{children}</ManagerShellContext.Provider>
  );
}

export function useManagerShell() {
  const context = useContext(ManagerShellContext);

  if (!context) {
    return {
      openMenu: () => undefined,
    };
  }

  return context;
}
