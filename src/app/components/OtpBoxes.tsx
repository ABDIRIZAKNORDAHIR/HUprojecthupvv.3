import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ShieldCheck } from 'lucide-react';
import '../styles/auth-motion.css';

interface OtpBoxesProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
  id?: string;
}

export function OtpBoxes({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  label = 'Verification code',
  id = 'otp',
}: OtpBoxesProps) {
  const reduceMotion = useReducedMotion();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = useMemo(
    () => Array.from({ length }, (_, index) => value[index] ?? ''),
    [value, length],
  );
  const complete = value.length === length;

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      commit(value.slice(0, index));
      return;
    }
    const next = (value.slice(0, index) + typed + value.slice(index + typed.length)).slice(0, length);
    const filled = commit(next);
    const cursor = Math.min(index + typed.length, length - 1);
    inputs.current[filled.length >= length ? length - 1 : cursor]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) commit(value.slice(0, index) + value.slice(index + 1));
      else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        inputs.current[index - 1]?.focus();
      }
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    const filled = commit(pasted);
    inputs.current[Math.min(filled.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-field">
      <div className="otp-field__head">
        <span className="auth-label" id={`${id}-label`}>{label}</span>
        <AnimatePresence mode="wait">
          {complete && (
            <motion.span
              key="ready"
              className="otp-chip otp-chip--ready"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Check size={12} /> Ready
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div
        className={`otp-boxes ${invalid ? 'otp-boxes--invalid' : ''}`}
        role="group"
        aria-labelledby={`${id}-label`}
        key={invalid ? 'shake' : 'calm'}
      >
        {digits.map((digit, index) => {
          const active = focusedIndex === index;
          return (
            <motion.div
              key={index}
              className={`otp-box ${digit ? 'is-filled' : ''} ${active ? 'is-active' : ''}`}
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: active && !reduceMotion ? 1.06 : 1 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.05, type: 'spring', stiffness: 320, damping: 22 }}
            >
              <input
                ref={(node) => { inputs.current[index] = node; }}
                id={index === 0 ? id : `${id}-${index}`}
                className="otp-box__input"
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                onFocus={(event) => { setFocusedIndex(index); event.target.select(); }}
                onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${index + 1} of ${length}`}
                maxLength={length}
                disabled={disabled}
              />
              <AnimatePresence>
                {digit && (
                  <motion.span
                    className="otp-box__glow"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <p className="otp-field__hint">
        <ShieldCheck size={13} /> Paste or type the 6-digit code from your inbox.
      </p>
    </div>
  );
}
