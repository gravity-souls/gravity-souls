import { Resend } from 'resend'

// No email provider is configured until RESEND_API_KEY is set — see
// docs/beta-execution.md's "Remaining launch gates". Until then, this
// logs the reset link server-side instead of throwing, so local/dev use
// (and anyone reading server logs) can still complete the flow manually.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Requires a domain verified in the Resend dashboard for real delivery;
// resend.dev's shared address only delivers to the Resend account's own
// verified email, never to arbitrary users — fine for testing, not for
// production. Set RESEND_FROM_EMAIL once a real sending domain exists.
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Gravity Souls <onboarding@resend.dev>'

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured — password reset email not sent.', { to, resetUrl })
    return
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Gravity Souls password',
    html: `
      <p>Someone requested a password reset for this email address on Gravity Souls.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
      <p>This link expires in 1 hour.</p>
    `,
  })
  if (error) {
    console.error('[email] Failed to send password reset email', { reference: crypto.randomUUID() })
  }
}
