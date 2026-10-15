import "../src/index.css";
import { ToastProvider } from "../src/components/Toast.jsx";

export const metadata = {
  title: "Website Tools",
  description: "A lightweight suite of essential tools for personal websites.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
