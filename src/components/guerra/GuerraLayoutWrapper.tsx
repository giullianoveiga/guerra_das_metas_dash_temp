'use client';

import { Suspense } from 'react';
import { GuerraLayout } from './GuerraLayout';

export function GuerraLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <GuerraLayout>{children}</GuerraLayout>
    </Suspense>
  );
}
