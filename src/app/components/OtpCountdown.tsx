import { useEffect, useState } from 'react';
import { WaitingMark } from './WaitingIcon';

interface OtpCountdownProps {
  /** Epoch milliseconds when the emailed code stops being accepted. */
  expiresAt: number;
  onExpire?: () => void;
}

function remainingMs(expiresAt: number) {
  return Math.max(0, expiresAt - Date.now());
}

function format(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Live validity timer for an emailed one-time code. */
export function OtpCountdown({ expiresAt, onExpire }: OtpCountdownProps) {
  const [left, setLeft] = useState(() => remainingMs(expiresAt));

  useEffect(() => {
    setLeft(remainingMs(expiresAt));
    const id = setInterval(() => {
      const next = remainingMs(expiresAt);
      setLeft(next);
      if (next <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (left <= 0) onExpire?.();
  }, [left, onExpire]);

  const expired = left <= 0;
  const urgent = !expired && left <= 60_000;

  return (
    <p
      className={`otp-timer${expired ? ' otp-timer--dead' : urgent ? ' otp-timer--urgent' : ''}`}
      role="status"
      aria-live={urgent || expired ? 'polite' : 'off'}
    >
      <WaitingMark size={15} tone={expired ? 'violet' : 'amber'} />
      {expired ? (
        <span>Code expired — request a new one</span>
      ) : (
        <span>Code expires in <strong>{format(left)}</strong></span>
      )}
    </p>
  );
}
