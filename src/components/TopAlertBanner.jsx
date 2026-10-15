import { AlertOctagon, AlertTriangle, ExternalLink, Info, Megaphone, X } from "lucide-react";

export default function TopAlertBanner({ notifications = [], onDismiss, onMarkRead }) {
  // Find active, un-dismissed banner notifications
  const bannerNotifs = notifications.filter(
    (n) => (n.is_banner || n.severity === "urgent") && !n.is_dismissed
  );

  if (bannerNotifs.length === 0) return null;

  return (
    <div className="top-alert-banners" aria-label="System announcements">
      {bannerNotifs.map((notif) => {
        const severityClass = notif.severity || "info";

        let IconComponent = Megaphone;
        if (notif.severity === "urgent") IconComponent = AlertOctagon;
        else if (notif.severity === "warning") IconComponent = AlertTriangle;
        else if (notif.severity === "info") IconComponent = Info;

        return (
          <div
            key={notif.id}
            className={`top-alert-banner alert-${severityClass}`}
            role="alert"
          >
            <div className="top-alert-content">
              <IconComponent size={18} className="top-alert-icon" />
              <div className="top-alert-text">
                <span className="top-alert-title">{notif.title}</span>
                <span className="top-alert-sep">—</span>
                <span className="top-alert-message">{notif.message}</span>
              </div>
            </div>

            <div className="top-alert-actions">
              {notif.action_label && notif.action_url && (
                <a
                  href={notif.action_url}
                  className="top-alert-action-btn"
                  onClick={() => onMarkRead && onMarkRead(notif.id)}
                  target={notif.action_url.startsWith("http") ? "_blank" : undefined}
                  rel={notif.action_url.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {notif.action_label}
                  {notif.action_url.startsWith("http") && <ExternalLink size={12} />}
                </a>
              )}

              <button
                type="button"
                className="top-alert-close-btn"
                onClick={() => onDismiss(notif.id)}
                aria-label={`Dismiss announcement: ${notif.title}`}
                title="Dismiss banner"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
