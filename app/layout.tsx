import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AeroForge QUAD — Aerodynamic Workbench',
  description: 'Interactive aerodynamic modelling and flight-load simulation for quadcopters.',
  openGraph: {
    title: 'AeroForge QUAD',
    description: 'Aerodynamic Workbench',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'AeroForge QUAD aerodynamic workbench' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AeroForge QUAD',
    description: 'Aerodynamic Workbench',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
