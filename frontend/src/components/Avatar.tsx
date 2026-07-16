import styles from './Avatar.module.css';

const GRADIENTS = [
  'linear-gradient(135deg, var(--accent), var(--accent-3))',
  'linear-gradient(135deg, var(--accent-2), var(--accent-4))',
  'linear-gradient(135deg, var(--accent-3), var(--accent))',
  'linear-gradient(135deg, var(--accent-4), var(--accent-2))',
];

function hashOf(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const gradient = GRADIENTS[hashOf(name) % GRADIENTS.length];
  return (
    <span className={[styles.avatar, styles[size]].join(' ')} style={{ background: gradient }} aria-hidden>
      {initial}
    </span>
  );
}
