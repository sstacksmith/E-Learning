"use client";
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { TimeTrackingProvider } from "@/context/TimeTrackingContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TimeTrackingProvider>
        {children}
      </TimeTrackingProvider>
    </AuthProvider>
  );
} 