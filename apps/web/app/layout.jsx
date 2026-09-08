export const metadata = { title: "Couples Coach", description: "Privacy-first AI couples coaching" };

import Providers from "./providers";
import Header from "./components/header";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f7f5f2", color: "#1b1b1b" }}>
        <Providers>
          <Header />
          <main style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
