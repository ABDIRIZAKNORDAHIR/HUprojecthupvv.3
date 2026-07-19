import { ShieldCheck, Users, Bot, IdCard, ClipboardCheck, Sparkles } from 'lucide-react';
import { HU_BRAND_GREEN } from '../config/appImages';

const items = [
  { icon: IdCard, label: 'HU ID' },
  { icon: Users, label: 'Teams' },
  { icon: Bot, label: 'AI Review' },
  { icon: ClipboardCheck, label: 'Approvals' },
  { icon: ShieldCheck, label: 'Secure' },
  { icon: Sparkles, label: 'Chat' },
];

export function HomeMarqueeStrip() {
  const track = [...items, ...items];

  return (
    <section className="home-marquee" aria-label="Platform highlights">
      <div className="home-marquee-fade home-marquee-fade--left" />
      <div className="home-marquee-fade home-marquee-fade--right" />
      <div className="home-marquee-track">
        {track.map(({ icon: Icon, label }, i) => (
          <span key={`${label}-${i}`} className="home-marquee-item">
            <Icon size={15} style={{ color: HU_BRAND_GREEN }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
