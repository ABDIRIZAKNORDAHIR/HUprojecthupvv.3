import { motion } from 'motion/react';
import {
  FolderKanban,
  Users,
  MessageSquare,
  ClipboardCheck,
  Bot,
  ShieldCheck,
  IdCard,
  BarChart3,
  Globe,
  FileSearch,
} from 'lucide-react';
import { HU_BRAND_GREEN } from '../config/appImages';

const keys = [
  { icon: IdCard, title: 'HU ID', hint: 'Verified campus access' },
  { icon: FolderKanban, title: 'Projects', hint: 'Propose & track work' },
  { icon: Users, title: 'Teams', hint: 'Invite and collaborate' },
  { icon: MessageSquare, title: 'Chat', hint: 'Project conversations' },
  { icon: Bot, title: 'Athena AI', hint: 'Review assistance' },
  { icon: ClipboardCheck, title: 'Approvals', hint: 'Teacher decisions' },
  { icon: FileSearch, title: 'Atlas', hint: 'Project archive' },
  { icon: BarChart3, title: 'Progress', hint: 'Status & scores' },
  { icon: ShieldCheck, title: 'Secure', hint: 'Role-based portals' },
  { icon: Globe, title: 'Campus', hint: 'Hormuud University' },
];

export function HomeGraphicKeys() {
  return (
    <section className="ph-keys ph-keys--light" id="keys">
      <div className="ph-keys-glow" aria-hidden />
      <div className="ph-keys-inner">
        <motion.div
          className="ph-section-head"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Platform</p>
          <h2 className="ph-section-title ph-section-title--ink">
            Built for <span style={{ color: HU_BRAND_GREEN }}>academic excellence</span>
          </h2>
          <p className="ph-section-sub ph-section-sub--ink">
            Icons of the system — every capability in one professional workspace.
          </p>
        </motion.div>

        <div className="ph-keys-grid ph-keys-grid--dense">
          {keys.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                className="ph-key-plate ph-key-plate--light"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, boxShadow: '0 20px 44px rgba(22,163,74,0.14)' }}
              >
                <span className="ph-key-icon ph-key-icon--green">
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.hint}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
