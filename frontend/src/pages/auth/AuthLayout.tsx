import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={[styles.blob, styles.blob1].join(' ')} />
        <div className={[styles.blob, styles.blob2].join(' ')} />
        <div className={styles.heroBrand}>
          <div className={styles.heroMark} />
          <span className={styles.heroBrandName}>QuixHub</span>
        </div>
        <div className={styles.heroCopy}>
          <div className={styles.heroTitle}>Estuda comigo, UFC Quixadá?</div>
          <p className={styles.heroDesc}>
            Materiais de prova, feedback real sobre disciplinas e a agenda da turma — tudo num só lugar, feito por
            quem também tá cursando.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>1.2k+</span>
            <span className={styles.heroStatLabel}>materiais</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>38</span>
            <span className={styles.heroStatLabel}>disciplinas</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>100%</span>
            <span className={styles.heroStatLabel}>anônimo</span>
          </div>
        </div>
      </div>
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.mobileBrand}>
            <div className={styles.mobileMark} />
            <span className={styles.mobileBrandName}>QuixHub</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
