import { LogOut, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { currentUser, disciplines } from '../data/mock';
import styles from './Profile.module.css';

const ACCENT_DOT: Record<string, string> = {
  accent: 'var(--accent)',
  accent2: 'var(--accent-2)',
  accent3: 'var(--accent-3)',
  accent4: 'var(--accent-4)',
};

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      className={[styles.switch, on ? styles.switchOn : ''].join(' ')}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      tabIndex={0}
    >
      <div className={styles.switchKnob} />
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [trackedIds, setTrackedIds] = useState(new Set(disciplines.filter((d) => d.tracked).map((d) => d.id)));
  const [notifs, setNotifs] = useState({ emailDeadlines: true, pushDeadlines: true, weeklyDigest: false });

  const tracked = disciplines.filter((d) => trackedIds.has(d.id));

  return (
    <div>
      <div className={styles.header}>
        <Avatar name={currentUser.name} size="lg" />
        <div>
          <div className={styles.name}>{currentUser.name}</div>
          <div className={styles.email}>{currentUser.email}</div>
          <div className={styles.email}>{currentUser.course}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Disciplinas acompanhadas</div>
        {tracked.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Nenhuma disciplina acompanhada. <Link to="/catalogo">Explorar catálogo</Link>
          </p>
        )}
        {tracked.map((d) => (
          <div key={d.id} className={styles.disciplineRow}>
            <span className={styles.disciplineDot} style={{ background: ACCENT_DOT[d.accent] }} />
            <span className={styles.disciplineName}>{d.name}</span>
            <button
              style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}
              onClick={() =>
                setTrackedIds((cur) => {
                  const next = new Set(cur);
                  next.delete(d.id);
                  return next;
                })
              }
              aria-label={`Deixar de acompanhar ${d.name}`}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Notificações</div>
        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>E-mail para prazos</div>
            <div className={styles.toggleDesc}>Receba um lembrete por e-mail próximo dos prazos.</div>
          </div>
          <Switch on={notifs.emailDeadlines} onToggle={() => setNotifs((n) => ({ ...n, emailDeadlines: !n.emailDeadlines }))} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>Push para prazos</div>
            <div className={styles.toggleDesc}>Notificação no navegador/app.</div>
          </div>
          <Switch on={notifs.pushDeadlines} onToggle={() => setNotifs((n) => ({ ...n, pushDeadlines: !n.pushDeadlines }))} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>Resumo semanal</div>
            <div className={styles.toggleDesc}>Novos materiais e feedback da semana.</div>
          </div>
          <Switch on={notifs.weeklyDigest} onToggle={() => setNotifs((n) => ({ ...n, weeklyDigest: !n.weeklyDigest }))} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Conta</div>
        <Button variant="ghost" className={styles.danger} onClick={() => navigate('/login')}>
          <LogOut size={16} /> Sair da conta
        </Button>
      </div>
    </div>
  );
}
