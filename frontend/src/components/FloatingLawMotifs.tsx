import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  FileText,
  Landmark,
  Library,
  Scale,
  ScrollText,
  Shield,
} from 'lucide-react';

type Motif = {
  Icon: LucideIcon;
  top: string;
  left?: string;
  right?: string;
  size: string;
  duration: string;
  delay: string;
  rotate: string;
};

const MOTIFS: Motif[] = [
  { Icon: Scale, top: '6%', left: '4%', size: 'clamp(2.75rem, 7vw, 4.5rem)', duration: '22s', delay: '0s', rotate: '-8deg' },
  { Icon: Landmark, top: '14%', right: '6%', size: 'clamp(2.5rem, 6vw, 4rem)', duration: '26s', delay: '1.2s', rotate: '6deg' },
  { Icon: BookOpen, top: '38%', left: '3%', size: 'clamp(2.25rem, 5.5vw, 3.75rem)', duration: '20s', delay: '2.4s', rotate: '4deg' },
  { Icon: ScrollText, top: '52%', right: '4%', size: 'clamp(2.5rem, 6vw, 4rem)', duration: '24s', delay: '0.8s', rotate: '-5deg' },
  { Icon: FileText, top: '68%', left: '8%', size: 'clamp(2rem, 5vw, 3.25rem)', duration: '28s', delay: '3s', rotate: '7deg' },
  { Icon: Library, top: '78%', right: '10%', size: 'clamp(2.75rem, 7vw, 4.25rem)', duration: '21s', delay: '1.8s', rotate: '-4deg' },
  { Icon: Shield, top: '28%', left: '42%', size: 'clamp(2rem, 4.5vw, 3rem)', duration: '30s', delay: '4s', rotate: '3deg' },
  { Icon: Scale, top: '88%', left: '22%', size: 'clamp(2.25rem, 5vw, 3.5rem)', duration: '25s', delay: '2s', rotate: '-6deg' },
  { Icon: Landmark, top: '48%', right: '18%', size: 'clamp(2rem, 4vw, 3rem)', duration: '27s', delay: '5s', rotate: '5deg' },
];

/**
 * Decorative law-themed shapes behind app content. Does not capture pointer events.
 */
export default function FloatingLawMotifs() {
  return (
    <div
      className="fixed inset-0 z-[1] overflow-hidden pointer-events-none motion-reduce:hidden"
      aria-hidden
    >
      {MOTIFS.map((m, i) => {
        const Icon = m.Icon;
        const pos = m.left != null ? { left: m.left } : { right: m.right ?? '5%' };
        return (
          <div
            key={`law-motif-${i}`}
            className="absolute text-primary/[0.11] dark:text-primary/[0.16]"
            style={{
              top: m.top,
              ...pos,
              width: m.size,
              height: m.size,
              animation: `law-float-drift ${m.duration} ease-in-out infinite`,
              animationDelay: m.delay,
            }}
          >
            <div
              className="h-full w-full"
              style={{ transform: `rotate(${m.rotate})` }}
            >
              <Icon className="h-full w-full" strokeWidth={1.15} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
