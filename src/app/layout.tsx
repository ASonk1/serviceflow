import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "ServiceFlow — Scheduling in one calm flow",
    template: "%s · ServiceFlow",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "appointment scheduling",
    "booking software",
    "team availability",
    "service business software",
    "SaaS portfolio",
  ],
  authors: [{ name: "ServiceFlow" }],
  creator: "ServiceFlow",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "ServiceFlow — Scheduling in one calm flow",
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: "ServiceFlow — Scheduling in one calm flow",
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#090d1c",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
