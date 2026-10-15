"use client";

import { Suspense } from "react";
import Dashboard from "../../src/pages/Dashboard.jsx";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>Loading dashboard…</div>}>
      <Dashboard />
    </Suspense>
  );
}
