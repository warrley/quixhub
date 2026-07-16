'use client';

import { UploadCloud } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import styles from './UploadDropzone.module.css';

export function UploadDropzone({ fileName, onFile }: { fileName?: string; onFile: (name: string) => void }) {
  const [active, setActive] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setActive(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file.name);
  }

  return (
    <div
      className={[styles.zone, active ? styles.zoneActive : ''].join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
      onClick={() => onFile(fileName ?? 'material-anexado.pdf')}
      role="button"
      tabIndex={0}
    >
      <div className={styles.icon}>
        <UploadCloud size={22} />
      </div>
      <div className={styles.title}>{fileName ?? 'Arraste um arquivo ou clique para escolher'}</div>
      <div className={styles.hint}>PDF, imagem ou ZIP · até 25MB</div>
    </div>
  );
}
