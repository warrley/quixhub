const GRADIENTS = [
  'linear-gradient(135deg, var(--color-accent), var(--color-accent-3))',
  'linear-gradient(135deg, var(--color-accent-2), var(--color-accent-4))',
  'linear-gradient(135deg, var(--color-accent-3), var(--color-accent))',
  'linear-gradient(135deg, var(--color-accent-4), var(--color-accent-2))',
];

function hashOf(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-[30px] h-[30px] text-xs',
  md: 'w-10 h-10 text-15',
  lg: 'w-[60px] h-[60px] text-22',
};

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const gradient = GRADIENTS[hashOf(name) % GRADIENTS.length];
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-heading font-bold text-ink-inverse shadow-[0_4px_12px_-4px_oklch(53%_0.2_264_/_45%)] ${SIZE[size]}`}
      style={{ background: gradient }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
