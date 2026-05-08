import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Mail,
  MessageSquare,
  Heart,
  LayoutDashboard,
  Code2,
  Settings,
  Database,
  Terminal,
  Layers,
  Shield,
  Inbox,
  Plug,
  LogOut,
  ChevronRight,
  FormInput,
  Menu,
  X,
  UserCog,
  LifeBuoy,
} from "lucide-react";

// ── Tab → Group mapping ────────────────────────────────────────
const TAB_GROUP_MAP = {
  overview:             "guestbook",
  embed:                "guestbook",
  settings:             "guestbook",
  data:                 "guestbook",
  tester:               "guestbook",
  "forms-overview":     "contact-forms",
  forms:                "contact-forms",
  "forms-integration":  "contact-forms",
  submissions:          "contact-forms",
  "comments-overview":  "comments",
  "comment-sections":   "comments",
  "comments-integration": "comments",
  "comment-moderation": "comments",
  likes:                "likes",
  account:              "account",
  "contact-admin":      "support",
};

const NAV_GROUPS = [
  {
    id: "guestbook",
    label: "Guestbook",
    Icon: BookOpen,
    defaultTab: "overview",
    items: [
      { id: "overview",  label: "Overview",   Icon: LayoutDashboard },
      { id: "embed",     label: "Embed",      Icon: Code2 },
      { id: "settings",  label: "Settings",   Icon: Settings },
      { id: "data",      label: "Data",       Icon: Database },
      { id: "tester",    label: "API Tester", Icon: Terminal },
    ],
  },
  {
    id: "contact-forms",
    label: "Contact Forms",
    Icon: Mail,
    defaultTab: "forms-overview",
    items: [
      { id: "forms-overview",    label: "Overview",     Icon: LayoutDashboard },
      { id: "forms",             label: "Form Builder", Icon: FormInput },
      { id: "forms-integration", label: "Integration",  Icon: Plug },
      { id: "submissions",       label: "Submissions",  Icon: Inbox },
    ],
  },
  {
    id: "comments",
    label: "Comments",
    Icon: MessageSquare,
    defaultTab: "comments-overview",
    items: [
      { id: "comments-overview",    label: "Overview",   Icon: LayoutDashboard },
      { id: "comment-sections",     label: "Sections",   Icon: Layers },
      { id: "comments-integration", label: "Integration", Icon: Plug },
      { id: "comment-moderation",   label: "Moderation", Icon: Shield },
    ],
  },
  {
    id: "likes",
    label: "Likes",
    Icon: Heart,
    defaultTab: "likes",
    items: null, // direct nav, no sub-items
  },
  {
    id: "account",
    label: "Account",
    Icon: UserCog,
    defaultTab: "account",
    items: null,
  },
  {
    id: "support",
    label: "Contact Admin",
    Icon: LifeBuoy,
    defaultTab: "contact-admin",
    items: null,
  },
];

export default function Sidebar({ activeTab, onTabChange, username, role, onLogout }) {
  const activeGroup = TAB_GROUP_MAP[activeTab] || "guestbook";

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState(() => new Set([activeGroup]));
  
  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync: when activeTab changes externally (e.g., URL nav), ensure the group is visible
  useEffect(() => {
    const g = TAB_GROUP_MAP[activeTab] || "guestbook";
    setOpenGroups((prev) => {
      if (prev.has(g)) return prev;
      return new Set([...prev, g]);
    });
  }, [activeTab]);

  function handleGroupClick(group) {
    if (!group.items) {
      // Direct nav (e.g., Likes)
      onTabChange(group.defaultTab);
      return;
    }
    const isOpen = openGroups.has(group.id);
    if (!isOpen) {
      // Open and navigate to default sub-tab
      setOpenGroups((prev) => new Set([...prev, group.id]));
      onTabChange(group.defaultTab);
      if (window.innerWidth <= 768 && !group.items) {
        setIsMobileMenuOpen(false);
      }
    } else {
      // Close (don't navigate)
      setOpenGroups((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
    }
  }

  return (
    <aside className={`dashboard-sidebar${isMobileMenuOpen ? " mobile-open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-left">
          <Link to="/" className="sidebar-brand">
            Website<span style={{ color: "var(--color-accent)" }}>Tools</span>
          </Link>
          <div className="sidebar-username">
            <a href={`/u/${username}`} target="_blank" rel="noreferrer">
              /u/{username} ↗
            </a>
          </div>
        </div>
        <button
          className="sidebar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {NAV_GROUPS.map((group) => {
          const isOpen       = openGroups.has(group.id);
          const isGroupActive = activeGroup === group.id;
          const { Icon }     = group;

          return (
            <div key={group.id} className="sidebar-group">
              {/* Parent button */}
              <button
                className={group.items ? `sidebar-group-btn${isGroupActive ? " active-group" : ""}` : `sidebar-link${isGroupActive ? " active" : ""}`}
                onClick={() => {
                  handleGroupClick(group);
                  if (!group.items && window.innerWidth <= 768) {
                    setIsMobileMenuOpen(false);
                  }
                }}
                aria-expanded={group.items ? isOpen : undefined}
              >
                <Icon size={group.items ? 16 : 13} style={{ flexShrink: 0 }} />
                {group.label}
                {group.items && (
                  <ChevronRight
                    size={14}
                    className={`sidebar-group-btn-chevron${isOpen ? " open" : ""}`}
                  />
                )}
              </button>

              {/* Sub-items */}
              {group.items && isOpen && (
                <div className="sidebar-sub-links">
                  {group.items.map((item) => {
                    const { Icon: ItemIcon } = item;
                    return (
                      <button
                        key={item.id}
                        className={`sidebar-link${activeTab === item.id ? " active" : ""}`}
                        onClick={() => {
                          onTabChange(item.id);
                          if (window.innerWidth <= 768) {
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        aria-current={activeTab === item.id ? "page" : undefined}
                      >
                        <ItemIcon size={13} style={{ flexShrink: 0 }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {role === "admin" && (
          <Link className="sidebar-link" to="/admin">
            <Shield size={13} style={{ flexShrink: 0 }} />
            Admin
          </Link>
        )}
        <button className="sidebar-link danger" onClick={onLogout}>
          <LogOut size={13} style={{ flexShrink: 0 }} />
          Logout
        </button>
      </div>
    </aside>
  );
}
