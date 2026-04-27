import { useState } from 'react';

export default function AccountTab({
  email, setEmail,
  telegramChatId, setTelegramChatId,
  telegramNotifications, setTelegramNotifications,
  saveSettings,
  testTelegramNotification,
  updatePassword
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNote, setPasswordNote] = useState('');

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordNote('');

    if (newPassword.length < 8) {
      setPasswordNote('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNote('New password and confirmation do not match.');
      return;
    }

    setPasswordBusy(true);
    const updated = await updatePassword({ currentPassword, newPassword });
    setPasswordBusy(false);

    if (updated) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNote('Password updated successfully.');
    }
  }

  return (
    <div className="account-tab">
      <div className="panel-card">
        <h3>Account Settings</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
          Manage your contact and notification settings.
        </p>

        <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label htmlFor="account-email">Email Address</label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
            Your email is kept private. We'll use it if we ever need to contact you regarding your account.
          </p>
        </div>

        <hr />

        <h4>Telegram Notifications</h4>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          Receive real-time alerts when someone signs your guestbook, leaves a comment, or submits a form.
        </p>

        <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label htmlFor="telegram-chat-id">Telegram Chat ID</label>
          <input
            id="telegram-chat-id"
            type="text"
            value={telegramChatId}
            onChange={(e) => {
              setTelegramChatId(e.target.value);
              if (!e.target.value.trim()) setTelegramNotifications(false);
            }}
            placeholder="e.g., 123456789"
          />
          <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
            This is your <strong>numeric</strong> ID, not your username. To find it, start a chat with <strong>@userinfobot</strong> on Telegram.
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="checkbox-label" style={{ opacity: !telegramChatId.trim() ? 0.5 : 1 }}>
            <input
              type="checkbox"
              checked={telegramNotifications}
              onChange={(e) => setTelegramNotifications(e.target.checked)}
              disabled={!telegramChatId.trim()}
            />
            Receive Telegram Notifications
          </label>
        </div>

        <div className="actions-row">
          <button className="primary" onClick={saveSettings}>
            Save Changes
          </button>
          <button
            className="secondary"
            onClick={testTelegramNotification}
            disabled={!telegramChatId.trim() || !telegramNotifications}
          >
            Send Test Alert
          </button>
        </div>

        <hr />

        <h4>Update Password</h4>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          Change the password you use to sign in to this dashboard.
        </p>

        <form onSubmit={handlePasswordSubmit} style={{ marginBottom: 0 }}>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="confirm-new-password">Confirm New Password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          {passwordNote && (
            <p className="text-xs text-muted" style={{ marginTop: '-8px' }}>
              {passwordNote}
            </p>
          )}

          <div className="actions-row">
            <button className="primary" type="submit" disabled={passwordBusy}>
              {passwordBusy ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
