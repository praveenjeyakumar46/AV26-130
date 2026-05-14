import { ReactNode } from 'react';

/** Main content area — inherits page background */
export default function PageBackground({ children }: { children: ReactNode }) {
  return <div className="min-h-full flex-1 flex flex-col">{children}</div>;
}
