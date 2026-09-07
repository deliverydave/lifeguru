export const metadata = { title: "Couples Coach", description: "Privacy-first AI couples coaching" };

const nav = [
  { href: "/counselor", label: "My Counselor" },
  { href: "/relationship", label: "Our Relationship" },
  { href: "/data", label: "My Data" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <header style={{ borderBottom: "1px solid #ddd", padding: "12px 16px" }}>
          <strong>Couples Coach</strong>
          <nav style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {nav.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
        </header>
        <main style={{ padding: 16 }}>{children}</main>
      </body>
    </html>
  );
}
