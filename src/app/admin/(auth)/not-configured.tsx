export function NotConfigured() {
  return (
    <p className="text-muted text-sm">
      The editor desk needs Supabase. Add <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
      <code>.env.local</code>, then restart the server.
    </p>
  );
}
