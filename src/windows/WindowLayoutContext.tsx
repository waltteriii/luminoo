import { createContext, useContext } from 'react';

export type LayoutTier = 'narrow' | 'medium' | 'wide';

export type WindowLayoutContextValue = {
  tier: LayoutTier;
  width: number;
  height: number;
};

const WindowLayoutContext = createContext<WindowLayoutContextValue>({
  tier: 'wide',
  width: 0,
  height: 0,
});

export function WindowLayoutProvider({
  value,
  children,
}: {
  value: WindowLayoutContextValue;
  children: React.ReactNode;
}) {
  return <WindowLayoutContext.Provider value={value}>{children}</WindowLayoutContext.Provider>;
}

export function useWindowLayout() {
  return useContext(WindowLayoutContext);
}

