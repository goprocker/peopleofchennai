"use client";

import Link from "next/link";
import { ActionForm, AdminField } from "@/components/admin/action-form";
import { requestPasswordReset, signIn, updatePassword } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={signIn} submitLabel="Sign in" pendingLabel="Signing in…">
      {({ fieldError }) => (
        <>
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <AdminField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
            error={fieldError("email")}
          />
          <AdminField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={fieldError("password")}
          />
          <p className="text-sm">
            <Link href="/admin/forgot-password" className="underline underline-offset-4">
              Forgot your password?
            </Link>
          </p>
        </>
      )}
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  return (
    <ActionForm
      action={requestPasswordReset}
      submitLabel="Send reset link"
      pendingLabel="Sending…"
      successMessage="If that address belongs to an editor, a reset link is on its way."
    >
      {({ fieldError }) => (
        <AdminField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fieldError("email")}
        />
      )}
    </ActionForm>
  );
}

export function ResetPasswordForm() {
  return (
    <ActionForm action={updatePassword} submitLabel="Set new password">
      {({ fieldError }) => (
        <>
          <AdminField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="At least 12 characters."
            required
            error={fieldError("password")}
          />
          <AdminField
            label="Confirm password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            error={fieldError("confirm")}
          />
        </>
      )}
    </ActionForm>
  );
}
