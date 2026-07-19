import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

interface QuickActionTileProps {
  to: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  accent: string;
  index?: number;
}

export function QuickActionTile({
  to, title, description, icon: Icon, gradient, accent, index = 0,
}: QuickActionTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link
        to={to}
        className="group relative block rounded-2xl overflow-hidden border border-gray-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300"
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300" style={{ background: gradient }} />
        <div className="relative p-5 flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300"
            style={{ background: gradient }}
          >
            <Icon size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[15px] text-gray-900 tracking-tight">{title}</h3>
            {description ? (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
            ) : null}
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}
