import './globals.css';
import Shell from '@/components/Shell';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'Finexa - Binary Trading',
  description: 'Professional trading platform',
  icons: {
    icon: '/iconbarlogo.png',
    shortcut: '/iconbarlogo.png',
    apple: '/iconbarlogo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <Providers>
          <Shell>
            {children}
          </Shell>
        </Providers>
      </body>
    </html>
  );
}