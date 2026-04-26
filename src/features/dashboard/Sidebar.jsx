import { Link } from "react-router-dom";

const NAV_GROUPS = [
  {
    label: "Guestbook",
    items: [
      { id: "overview", label: "Overview",   icon: "◈" },
      { id: "embed",    label: "Embed",      icon: "⊙" },
      { id: "settings", label: "Settings",   icon: "⚙" },
      { id: "data",     label: "Data",       icon: "⬡" },
      { id: "tester",   label: "API Tester", icon: "⌥" },
    ],
  },
  {
    label: "Contact Forms",
    items: [
      { id: "forms",       label: "Forms",       icon: "☰" },
      { id: "submissions", label: "Submissions",  icon: "✉" },
    ],
  },
  {
    label: "Comments",
    items: [
      { id: "comment-sections",   label: "Sections",   icon: "≡" },
      { id: "comment-moderation", label: "Moderation", icon: "⊿" },
    ],
  },
  {
    label: "Likes",
    items: [
      { id: "likes", label: "Likes", icon: "♥" },
    ],
  },
];

export default function Sidebar({ activeTab, onTabChange, username, onLogout }) {
  return (
    <aside className="dashboard-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          Website<span style={{ color: "var(--color-accent)" }}>Tools</span>
        </Link>
        <div className="sidebar-username">
          <a href={`/u/${username}`} target="_blank" rel="noreferrer">
            /u/{username} ↗
          </a>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="sidebar-group">
            <div className="sidebar-group-label">{group.label}</div>
            <div className="sidebar-links">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-link${activeTab === item.id ? " active" : ""}`}
                  onClick={() => onTabChange(item.id)}
                  aria-current={activeTab === item.id ? "page" : undefined}
                >
                  <span aria-hidden="true" style={{ fontSize: "0.875rem", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-link danger" onClick={onLogout}>
          <span aria-hidden="true">⏻</span> Logout
        </button>
      </div>
    </aside>
  );
}
