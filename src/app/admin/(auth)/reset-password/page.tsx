import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "../auth-forms";
import { NotConfigured } from "../not-configured";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <div className="mt-5">
        {data.user ? (
          <ResetPasswordForm />
        ) : (
          <p className="text-sm">
            This reset link has expired.{" "}
            <Link href="/admin/forgot-password" className="underline underline-offset-4">
              Request a new one
            </Link>
            .
          </p>
        )}
      </div>
    </>
  );
}
