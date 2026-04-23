import type {Metadata} from 'next';
import './globals.css';
import { TVModeProvider } from '@/contexts/TVModeContext';

export const metadata: Metadata = {
  title: 'Guerra das Metas | Dashboard Tático',
  description: 'Painel tático de desempenho e rankings operacionais.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/20 selection:text-primary overflow-x-hidden bg-background">
        <TVModeProvider>
          {children}
        </TVModeProvider>
      </body>
    </html>
  );
}
