"use client";

import { Suspense } from "react";
import Docs from "../../../src/pages/Docs.jsx";

export default function DocsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>Loading documentation…</div>}>
      <Docs />
    </Suspense>
  );
}
