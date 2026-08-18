/** Shown only when the API returns a development OTP (no mail transport configured). */
export function DevOtpReveal({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <div className="authx__dev-otp" role="status">
      <span className="authx__dev-otp-label">Development code</span>
      <strong className="authx__dev-otp-code">{code}</strong>
      <span className="authx__dev-otp-hint">
        Email sending is not configured — this code is shown only in development. Set SMTP_PASS in `.env` to deliver real codes.
      </span>
    </div>
  );
}
