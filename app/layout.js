import './globals.css';

export const metadata = {
  title: 'FlowStable Terminal',
  description: 'Advanced Mainnet Explorer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}