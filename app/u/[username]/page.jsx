import { Suspense } from "react";
import PublicGuestbook from "../../../src/pages/PublicGuestbook.jsx";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const username = resolvedParams?.username || "";
  return {
    title: username ? `${username}'s Guestbook — Website Tools` : "Guestbook — Website Tools",
    description: `Leave a message on ${username}'s public guestbook.`,
  };
}

export default async function GuestbookPage({ params }) {
  const resolvedParams = await params;
  return (
    <Suspense
      fallback={
        <div className="guestbook-page-wrapper">
          <div className="guestbook-container" style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading guestbook…
          </div>
        </div>
      }
    >
      <PublicGuestbook overrideUsername={resolvedParams?.username} />
    </Suspense>
  );
}
