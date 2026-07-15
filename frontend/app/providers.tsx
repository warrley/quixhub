'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/lib/theme';
import { CalendarProvider } from '@/lib/calendarStore';
import { IraProvider } from '@/lib/iraStore';
import { FluxogramaProvider } from '@/lib/fluxogramaStore';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CalendarProvider>
          <IraProvider>
            <FluxogramaProvider>{children}</FluxogramaProvider>
          </IraProvider>
        </CalendarProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
