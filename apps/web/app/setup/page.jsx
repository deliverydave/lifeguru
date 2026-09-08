export default function SetupPage() {
  return (
    <section>
      <h1>Clerk setup required</h1>
      <p>
        Live auth needs a Clerk application. Without keys, the API returns <code>503</code> on private{" "}
        <code>/v1/*</code> routes. Unit tests use <code>M1_DEV_AUTH_BYPASS=1</code> and an injectable Clerk
        verifier — that flag is not a production login.
      </p>
      <ol>
        <li>
          Create an app at{" "}
          <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">
            dashboard.clerk.com
          </a>
        </li>
        <li>
          Copy <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> into{" "}
          <code>.env</code> (never commit it)
        </li>
        <li>
          Paths / redirect URLs: <code>http://localhost:3000/sign-in</code>,{" "}
          <code>http://localhost:3000/sign-up</code>, and after-auth <code>http://localhost:3000/onboarding</code>
        </li>
        <li>
          Restart <code>npm run dev:api</code> and <code>npm run dev:web</code>
        </li>
      </ol>
      <p>
        Optional local click-through without Clerk (not live auth): set{" "}
        <code>M1_DEV_AUTH_BYPASS=1</code> and <code>NEXT_PUBLIC_DEV_AUTH_BYPASS=1</code>, then use the header
        person switch as two humans.
      </p>
      <p>
        Details: <a href="https://github.com/deliverydave/lifeguru/blob/main/docs/M1.md">docs/M1.md</a> (after
        merge) and the README “M1 demo” section.
      </p>
    </section>
  );
}
