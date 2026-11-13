import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "../auth-forms";
import { NotConfigured } from "../not-configured";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getStaffSession()) redirect("/admin");
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      {error === "link" && (
        <p role="alert" className="text-error mt-3 text-sm">
          That link is invalid or has expired. Request a new one.
        </p>
      )}
      <div className="mt-5">
        {isSupabaseConfigured ? (
          <LoginForm next={typeof next === "string" ? next : undefined} />
        ) : (
          <NotConfigured />
        )}
      </div>
    </>
  );
}
