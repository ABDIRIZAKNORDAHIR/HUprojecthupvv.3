import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  iconBg: string;
  suffix?: string;
  index?: number;
}

export function KPICard({ title, value, change, icon: Icon, iconColor, iconBg, suffix = "", index = 0 }: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative bg-white rounded-xl p-5 border border-border shadow-sm cursor-pointer overflow-hidden group"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.04), rgba(37,99,235,0.04))' }} />
      <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={20} style={{ color: iconColor }} />
        </motion.div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
            isPositive ? "bg-green-50 text-green-600" : isNegative ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"
          }`} style={{ fontSize: 12, fontWeight: 600 }}>
            {isPositive ? <TrendingUp size={11} /> : isNegative ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
          {typeof value === "number" ? <AnimatedCounter value={value} suffix={suffix} /> : value}
        </div>
        <p style={{ fontSize: 13, color: "#64748B", fontWeight: 500, marginTop: 4 }}>{title}</p>
      </div>
      </div>
    </motion.div>
  );
}
