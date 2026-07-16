import styles from './StatBar.module.css';

export function StatBar({
  label,
  value,
  percent,
  tone = 'var(--accent)',
}: {
  label: string;
  value: string;
  percent: number;
  tone?: string;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.top}>
        <span>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${percent}%`, background: tone }} />
      </div>
    </div>
  );
}
