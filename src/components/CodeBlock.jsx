import { useState } from "react";

/**
 * CodeBlock - a styled, syntax-highlighted code block with a copy button.
 * Props:
 *   code     {string} - the code string to display
 *   rows     {number} - approximate max height in text rows
 *   label    {string} - optional label displayed above
 *   language {string} - html, javascript, json, css, bash, shell, text
 */
export default function CodeBlock({ code = "", rows = 8, label, language = "" }) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = normalizeLanguage(language || inferLanguage(code));
  const highlighted = highlightCode(code, normalizedLanguage);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = code;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "absolute";
      fallback.style.left = "-9999px";
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand("copy");
      document.body.removeChild(fallback);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="code-block">
      {label && (
        <div className="code-block-label">{label}</div>
      )}
      <div className="code-block-wrapper">
        <pre
          className={`code-view language-${normalizedLanguage}`}
          style={{ maxHeight: `${Math.max(rows, 4) * 1.65}rem` }}
        >
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
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

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value === "js" || value === "jsx") return "javascript";
  if (value === "sh" || value === "shell") return "bash";
  if (value === "html" || value === "css" || value === "json" || value === "bash" || value === "javascript") return value;
  return "text";
}

function inferLanguage(code) {
  const value = String(code || "").trim();
  if (!value) return "text";
  if (value.startsWith("<")) return "html";
  if (value.startsWith("{") || value.startsWith("[")) return "json";
  if (value.startsWith("#") || value.startsWith("curl ")) return "bash";
  if (/await fetch|const |let |function |document\.|=>/.test(value)) return "javascript";
  if (/[.#][\w-]+\s*\{|:\s*[^;]+;/.test(value)) return "css";
  return "text";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function span(className, value) {
  return `<span class="code-token ${className}">${escapeHtml(value)}</span>`;
}

function highlightCode(code, language) {
  if (language === "html") return highlightHtml(code);
  if (language === "javascript") return highlightScript(code, JS_KEYWORDS);
  if (language === "json") return highlightScript(code, JSON_KEYWORDS);
  if (language === "css") return highlightScript(code, CSS_KEYWORDS);
  if (language === "bash") return highlightScript(code, BASH_KEYWORDS, true);
  return escapeHtml(code);
}

function highlightHtml(code) {
  return String(code || "")
    .split(/(<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>)/g)
    .map((part) => {
      if (!part) return "";
      if (part.startsWith("<!--")) return span("code-comment", part);
      if (!part.startsWith("<")) return escapeHtml(part);

      const match = part.match(/^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/);
      if (!match) return escapeHtml(part);

      const [, open, tag, attrs, close] = match;
      const highlightedAttrs = attrs.replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)?/g, (_all, name, eq, value = "") => {
        return `${span("code-attr", name)}${escapeHtml(eq)}${value ? span("code-string", value) : ""}`;
      });

      return `${escapeHtml(open)}${span("code-tag", tag)}${highlightedAttrs}${escapeHtml(close)}`;
    })
    .join("");
}

function highlightScript(code, keywords, shellMode = false) {
  const tokenPattern = shellMode
    ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|#[^\n]*)/g
    : /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;

  return String(code || "")
    .split(tokenPattern)
    .map((part) => {
      if (!part) return "";
      if (part.startsWith("//") || part.startsWith("/*") || part.startsWith("#")) {
        return span("code-comment", part);
      }
      if (part.startsWith("\"") || part.startsWith("'") || part.startsWith("`")) {
        return span("code-string", part);
      }
      return highlightPlain(part, keywords);
    })
    .join("");
}

function highlightPlain(value, keywords) {
  const escaped = escapeHtml(value);
  const keywordPattern = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
  return escaped
    .replace(keywordPattern, '<span class="code-token code-keyword">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="code-token code-number">$1</span>');
}

const JS_KEYWORDS = [
  "async", "await", "break", "case", "catch", "const", "continue", "default", "else", "false",
  "for", "function", "if", "import", "let", "new", "null", "return", "throw", "true", "try", "var"
];

const JSON_KEYWORDS = ["true", "false", "null"];

const CSS_KEYWORDS = [
  "auto", "block", "border-box", "center", "flex", "grid", "none", "relative", "solid"
];

const BASH_KEYWORDS = ["curl", "export"];
