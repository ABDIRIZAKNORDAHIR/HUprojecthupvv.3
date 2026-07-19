import { motion } from "motion/react";
import { getScoreColor } from "../types";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function ProgressRing({ value, size = 100, strokeWidth = 8, label, sublabel, color: colorOverride }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = colorOverride ?? getScoreColor(value);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>
          {value}%
        </span>
        {label && <span style={{ fontSize: 10, color: "#64748B", fontWeight: 500 }}>{label}</span>}
        {sublabel && <span style={{ fontSize: 9, color: "#94A3B8" }}>{sublabel}</span>}
      </div>
    </div>
  );
}
