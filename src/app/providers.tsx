"use client";
import { SerwistProvider } from "@serwist/turbopack/react";
import { AppProvider } from "@/lib/app-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" options={{ scope: "/" }} disable={process.env.NODE_ENV !== "production"}>
      <AppProvider>{children}</AppProvider>
    </SerwistProvider>
  );
}
