import { Compass, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { EventChip } from '../components/EventChip';
import { MaterialCard } from '../components/MaterialCard';
import { calendarEvents, currentUser, disciplineById, disciplines, materials } from '../data/mock';
import styles from './Home.module.css';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia,';
  if (hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

export default function Home() {
  const trackedIds = disciplines.filter((d) => d.tracked).map((d) => d.id);
  const upcoming = calendarEvents.slice(0, 3);
  const recentMaterials = materials
    .filter((m) => m.status === 'published' && trackedIds.includes(m.disciplineId))
    .slice(0, 3);

  return (
    <div>
      <div className={styles.greetingRow}>
        <Avatar name={currentUser.name} size="lg" />
        <div>
          <div className={styles.greetingText}>{greeting()}</div>
          <div className={styles.greetingName}>{currentUser.name.split(' ')[0]}</div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} />
        <input placeholder="Buscar disciplinas, materiais..." />
      </div>

      {trackedIds.length === 0 ? (
        <EmptyState
          icon={<Compass size={26} />}
          title="Nenhuma disciplina acompanhada"
          description="Acompanhe disciplinas do catálogo para ver prazos e materiais aqui."
          action={
            <Link to="/catalogo">
              <Button>Explorar catálogo</Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.grid}>
          <section>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>Próximos prazos</span>
              <Link to="/calendario" className={styles.sectionLink}>
                ver agenda
              </Link>
            </div>
            <div className={styles.list}>
              {upcoming.map((event) => (
                <EventChip key={event.id} event={event} discipline={disciplineById(event.disciplineId)} />
              ))}
            </div>
          </section>

          <section>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>Novos materiais</span>
              <Link to="/materiais" className={styles.sectionLink}>
                ver tudo
              </Link>
            </div>
            <div className={styles.list}>
              {recentMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
