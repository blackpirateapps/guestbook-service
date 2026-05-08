import { useState } from "react";
import { Send } from "lucide-react";
import { useToast } from "../../components/Toast.jsx";

export default function ContactAdminTab({ token }) {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitMessage(e) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Message required", "Write a short note for the admin.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin-messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim()
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not send message.");
      }

      setSubject("");
      setMessage("");
      toast.success("Message sent", "The admin can now see it in the admin dashboard.");
    } catch (err) {
      toast.error("Send failed", err?.message || "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="contact-admin-tab">
      <div className="panel-card">
        <h3>Contact Admin</h3>
        <p className="text-muted text-sm" style={{ marginBottom: "var(--space-4)" }}>
          Send account questions, recovery requests, or support notes to the admin.
        </p>

        <form onSubmit={submitMessage} style={{ marginBottom: 0 }}>
          <div className="form-group">
            <label htmlFor="admin-contact-subject">Subject</label>
            <input
              id="admin-contact-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={140}
              placeholder="Account question"
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-contact-message">Message *</label>
            <textarea
              id="admin-contact-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4000}
              rows={7}
              placeholder="Tell the admin what you need help with."
              required
            />
            <p className="text-xs text-muted" style={{ marginTop: "4px" }}>
              {message.length}/4000 characters
            </p>
          </div>

          <div className="actions-row">
            <button className="primary" type="submit" disabled={busy}>
              <Send size={15} />
              {busy ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
