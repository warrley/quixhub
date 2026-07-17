import { Hammer } from 'lucide-react';
import { EmptyState } from './EmptyState';

export function UnderConstruction() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center pt-10">
      <EmptyState
        icon={<Hammer size={26} />}
        title="Em desenvolvimento"
        description="Esta funcionalidade ainda está sendo construída e estará disponível em breve."
      />
    </div>
  );
}
