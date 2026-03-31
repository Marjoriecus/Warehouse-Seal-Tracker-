import { Toaster } from 'sonner'; // 1. Professional notification provider
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Warehouse Seal Tracker",
  description: "Track and manage warehouse seals efficiently.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        
        {/* 2. Global Toast Anchor - Positioned for high visibility */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}