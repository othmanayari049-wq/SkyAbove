import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyAbove — Live aircraft around you",
  description: "Explore live aircraft moving around your current location.",
  applicationName: "SkyAbove",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#07121a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
