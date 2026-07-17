'use client';

import { UploadCloud } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

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
      className={`relative border-2 border-dashed border-line-strong rounded-lg py-8 px-4 flex flex-col items-center text-center gap-2.5 bg-surface text-ink-2 [transition:border-color_0.15s_ease,background-color_0.15s_ease] cursor-pointer hover:border-accent hover:bg-accent-tint ${active ? 'border-accent bg-accent-tint' : ''}`}
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
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <div className="w-12 h-12 rounded-full bg-gradient-brand text-white flex items-center justify-center shadow-glow">
        <UploadCloud size={22} />
      </div>
      <div className="font-heading font-bold text-sm text-ink">{fileName ?? 'Arraste um arquivo ou clique para escolher'}</div>
      <div className="text-xs text-ink-3">PDF, imagem ou ZIP · até 25MB</div>
    </div>
  );
}
