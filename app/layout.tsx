"use client";

import { GeistMono } from "geist/font/mono";
import { Roboto_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { BigIntProvider } from "@/components/providers/BigIntProvider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
});

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <QueryClientProvider client={queryClient}>
          <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
            <head>
              <title>Intentflow</title>
              <meta name="description" content="Build AI agents and workflows with visual programming" />
              <link rel="icon" href="/favicon.png" />
            </head>
            <body
              className={cn(
                "min-h-screen bg-background font-sans antialiased",
                GeistMono.variable,
                robotoMono.variable,
                inter.variable
              )}
            >
              <BigIntProvider>
                <main>{children}</main>
                <Toaster position="bottom-right" />
              </BigIntProvider>
            </body>
          </html>
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
