import { Clock3 } from 'lucide-react';
import { Tag } from './Tag';

export function ModerationBadge() {
  return (
    <Tag tone="warn" icon={<Clock3 size={12} />}>
      Em análise
    </Tag>
  );
}
