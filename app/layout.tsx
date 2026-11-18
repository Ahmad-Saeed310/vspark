import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draftly — social drafts, on schedule",
  description: "Write and organize your upcoming social media drafts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
