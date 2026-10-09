import type { Metadata } from "next";
import { Suspense } from "react";

import { WorkflowAdvisor } from "@/components/workflow-advisor";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Creative Studio",
  description: "Research a store and turn real product photos into reviewable ads.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full font-sans antialiased">
      <body className="min-h-full flex flex-col">{children}<Suspense><WorkflowAdvisor /></Suspense></body>
    </html>
  );
}
