import { createContext, useContext, type ReactNode } from 'react';

interface ManagerPreviewContextValue {
  enabled: boolean;
  exitPreview: () => void;
}

const ManagerPreviewContext = createContext<ManagerPreviewContextValue>({
  enabled: false,
  exitPreview: () => undefined,
});

export function ManagerPreviewProvider({
  children,
  enabled,
  exitPreview,
}: {
  children: ReactNode;
  enabled: boolean;
  exitPreview: () => void;
}) {
  return (
    <ManagerPreviewContext.Provider value={{ enabled, exitPreview }}>
      {children}
    </ManagerPreviewContext.Provider>
  );
}

export function useManagerPreview() {
  return useContext(ManagerPreviewContext);
}
