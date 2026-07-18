'use client';

import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';
import { ApiError, api } from '@/lib/api';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState('Engenharia de Software');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const verified = email.trim().toLowerCase().endsWith('@alu.ufc.br') || email.trim().toLowerCase().endsWith('@ufc.br');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.register({ name, email, password, course });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a conta. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-heading font-bold text-25 mb-1.5">Criar sua conta</h1>
      <p className="text-13-5 text-ink-2 mb-6 leading-[1.5]">Só alunos e professores da UFC Quixadá.</p>
      <form onSubmit={handleSubmit}>
        <TextField label="Nome completo" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField
          label="E-mail institucional"
          type="email"
          placeholder="seu.nome@alu.ufc.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {verified && (
          <div className="flex items-center gap-1.5 text-11-5 font-semibold text-good -mt-2.5 mb-4">
            <BadgeCheck size={14} />
            domínio @ufc.br verificado
          </div>
        )}
        <TextField
          label="Senha"
          type="password"
          placeholder="••••••••••"
          hint="Mínimo de 8 caracteres"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <SelectField label="Curso" value={course} onChange={(e) => setCourse(e.target.value)}>
          <option>Engenharia de Software</option>
          <option>Ciência da Computação</option>
          <option>Sistemas de Informação</option>
          <option>Engenharia da Computação</option>
        </SelectField>
        {error && <p className="text-13 text-danger mb-4">{error}</p>}
        <Button type="submit" block disabled={submitting}>
          {submitting ? 'Criando...' : 'Criar conta'}
        </Button>
      </form>
      <p className="text-center mt-5 text-13 text-ink-2">
        Já tem conta? <Link href="/login" className="font-semibold no-underline">Entrar</Link>
      </p>
    </>
  );
}
