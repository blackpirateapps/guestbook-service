import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  Megaphone,
  X,
} from "lucide-react";

function timeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function getSeverityDetails(severity) {
  switch (severity) {
    case "urgent":
      return {
        label: "Urgent",
        className: "badge-urgent",
        Icon: AlertOctagon,
      };
    case "warning":
      return {
        label: "Warning",
        className: "badge-warning",
        Icon: AlertTriangle,
      };
    case "success":
      return {
        label: "Success",
        className: "badge-success",
        Icon: CheckCircle2,
      };
    case "info":
    default:
      return {
        label: "Info",
        className: "badge-info",
        Icon: Info,
      };
  }
}

export default function NotificationCenter({
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }
    return () => document.body.classList.remove("drawer-open");
  }, [isOpen]);

  function handleActionClick(notif) {
    if (!notif.is_read && onMarkRead) {
      onMarkRead(notif.id);
    }
  }

  return (
    <div className="notification-center">
      <button
        type="button"
        className={`notification-bell-btn${unreadCount > 0 ? " has-unread" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-drawer-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={drawerRef}
        className={`notification-drawer${isOpen ? " open" : ""}`}
        aria-label="Notification Center"
        aria-hidden={!isOpen}
      >
        <header className="notification-drawer-header">
          <div className="notification-drawer-title-row">
            <div className="notification-drawer-title">
              <Bell size={18} />
              <h2>Notifications</h2>
              {unreadCount > 0 && (
                <span className="notification-unread-pill">{unreadCount} unread</span>
              )}
            </div>
            <button
              type="button"
              className="notification-drawer-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>

          <div className="notification-drawer-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={() => onMarkAllRead && onMarkAllRead()}
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>
        </header>

        <div className="notification-drawer-body">
          {notifications.length === 0 ? (
            <div className="notification-empty-state">
              <Megaphone size={32} className="notification-empty-icon" />
              <h3>All caught up</h3>
              <p>You don't have any notifications at this moment.</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notif) => {
                const { label: severityLabel, className: severityClass, Icon: SeverityIcon } =
                  getSeverityDetails(notif.severity);

                return (
                  <article
                    key={notif.id}
                    className={`notification-item${!notif.is_read ? " unread" : ""}`}
                  >
                    <div className="notification-item-header">
                      <div className="notification-item-meta">
                        <span className={`notification-severity-badge ${severityClass}`}>
                          <SeverityIcon size={12} />
                          {severityLabel}
                        </span>
                        {notif.is_banner === 1 && (
                          <span className="notification-banner-tag">Banner</span>
                        )}
                        <time className="notification-item-time" dateTime={notif.created_at}>
                          {timeAgo(notif.created_at)}
                        </time>
                      </div>

                      {!notif.is_read && onMarkRead && (
                        <button
                          type="button"
                          className="notification-mark-read-btn"
                          onClick={() => onMarkRead(notif.id)}
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>

                    <h4 className="notification-item-title">
                      {!notif.is_read && <span className="notification-unread-dot" />}
                      {notif.title}
                    </h4>

                    <div className="notification-item-message">{notif.message}</div>

                    {notif.action_label && notif.action_url && (
                      <div className="notification-item-action-row">
                        <a
                          href={notif.action_url}
                          className="notification-action-link"
                          onClick={() => handleActionClick(notif)}
                          target={notif.action_url.startsWith("http") ? "_blank" : undefined}
                          rel={notif.action_url.startsWith("http") ? "noopener noreferrer" : undefined}
                        >
                          <span>{notif.action_label}</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
