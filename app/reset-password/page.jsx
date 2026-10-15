"use client";

import { Suspense } from "react";
import ResetPassword from "../../src/pages/ResetPassword.jsx";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</div>}>
      <ResetPassword />
    </Suspense>
  );
}
