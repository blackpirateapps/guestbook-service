import { useState } from "react";

/**
 * CodeBlock — a styled, read-only code textarea with a copy button.
 * Props:
 *   code    {string}  — the code string to display
 *   rows    {number}  — textarea rows height (default 8)
 *   label   {string}  — optional label displayed above
 *   onCopy  {fn}      — optional callback after copy (receives copied:bool)
 */
export default function CodeBlock({ code = "", rows = 8, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
      const el = document.querySelector(`[data-codeid="${label}"]`);
      if (el) { el.select(); document.execCommand("copy"); }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      {label && (
        <label style={{ marginBottom: "6px", display: "block" }}>{label}</label>
      )}
      <div className="code-block-wrapper">
        <textarea
          className="code-textarea"
          rows={rows}
          readOnly
          value={code}
          data-codeid={label}
          spellCheck={false}
          style={{ paddingRight: "80px" }}
        />
        <button
          type="button"
          className={`code-block-copy${copied ? " copied" : ""}`}
          onClick={handleCopy}
          disabled={!code}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
