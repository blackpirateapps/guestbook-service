import { NavLink, Navigate, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DOC_NAV } from "../docs/docsRoutes.js";
import { DOCS_PAGES } from "../docs/docsContent.jsx";

export default function Docs() {
  const location = useLocation();
  const currentPath = normalizePath(location.pathname);
  const page = DOCS_PAGES[currentPath];

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [currentPath, location.hash]);

  if (!page) return <Navigate to="/docs" replace />;

  return (
    <div className="docs-shell">
      <aside className="docs-sidebar" aria-label="Documentation navigation">
        <Link to="/" className="docs-brand">
          <span>⬡</span>
          WebsiteTools
        </Link>

        <nav className="docs-nav">
          {DOC_NAV.map((group) => (
            <div key={group.title} className="docs-nav-group">
              <div className="docs-nav-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/docs"}
                  className={({ isActive }) => `docs-nav-link${isActive ? " active" : ""}`}
                >
                  {item.title}
                </NavLink>
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
