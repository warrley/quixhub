'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/lib/theme';
import { CalendarProvider } from '@/lib/calendarStore';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CalendarProvider>{children}</CalendarProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
