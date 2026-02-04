import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alcohol Origins Map - Embedded View',
  description: 'Interactive map of alcoholic beverage origins throughout history.',
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Google Fonts needed for popups */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Gudea:wght@400;700&family=Merriweather:wght@300;400;700&display=swap"
        rel="stylesheet"
      />
      <div className="w-full h-screen overflow-hidden">
        {children}
      </div>
    </>
  );
}
