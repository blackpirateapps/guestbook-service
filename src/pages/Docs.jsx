"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DOC_NAV } from "../docs/docsRoutes.js";
import { DOCS_PAGES } from "../docs/docsContent.jsx";

export default function Docs() {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = normalizePath(pathname || "/docs");
  const page = DOCS_PAGES[currentPath];

  useEffect(() => {
    if (!page) {
      router.replace("/docs");
      return;
    }
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [page, currentPath, router]);

  if (!page) return null;

  return (
    <div className="docs-shell">
      <aside className="docs-sidebar" aria-label="Documentation navigation">
        <Link href="/" className="docs-brand">
          <span>⬡</span>
          WebsiteTools
        </Link>

        <nav className="docs-nav">
          {DOC_NAV.map((group) => (
            <div key={group.title} className="docs-nav-group">
              <div className="docs-nav-title">{group.title}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`docs-nav-link${currentPath === item.path ? " active" : ""}`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="docs-page-toc">
          <div className="docs-nav-title">On this page</div>
          {page.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </div>
      </aside>

      <main className="docs-main">
        <article className="docs-article">
          <header className="docs-hero">
            <div className="docs-kicker">Documentation</div>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </header>

          {page.sections.map((section) => (
            <section key={section.id} id={section.id} className="docs-section">
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}

function normalizePath(pathname) {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}
