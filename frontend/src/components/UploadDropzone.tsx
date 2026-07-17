'use client';

import { UploadCloud } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import styles from './UploadDropzone.module.css';

export function UploadDropzone({
  fileName,
  onFile,
  accept,
}: {
  fileName?: string;
  onFile: (file: File) => void;
  accept?: string;
}) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setActive(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
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
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.hiddenInput}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <div className={styles.icon}>
        <UploadCloud size={22} />
      </div>
      <div className={styles.title}>{fileName ?? 'Arraste um arquivo ou clique para escolher'}</div>
      <div className={styles.hint}>PDF, imagem ou ZIP · até 25MB</div>
    </div>
  );
}
