"use client";

import { Suspense } from "react";
import Admin from "../../src/pages/Admin.jsx";

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>Loading admin…</div>}>
      <Admin />
    </Suspense>
  );
}
