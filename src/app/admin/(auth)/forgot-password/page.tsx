import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { ForgotPasswordForm } from "../auth-forms";
import { NotConfigured } from "../not-configured";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="text-muted mt-2 text-sm">We’ll email you a one-time link.</p>
      <div className="mt-5">{isSupabaseConfigured ? <ForgotPasswordForm /> : <NotConfigured />}</div>
      <p className="mt-5 text-sm">
        <Link href="/admin/login" className="underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
