import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.blob}>{icon}</div>
      <div className={styles.title}>{title}</div>
      <p className={styles.desc}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
