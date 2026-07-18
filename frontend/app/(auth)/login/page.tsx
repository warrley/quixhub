'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { ApiError, api } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login({ email, password });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-heading font-bold text-25 mb-1.5">Bem-vindo de volta</h1>
      <p className="text-13-5 text-ink-2 mb-6 leading-[1.5]">Entre com seu e-mail institucional para acessar sua turma.</p>
      <form onSubmit={handleSubmit}>
        <TextField
          label="E-mail"
          type="email"
          placeholder="seu.nome@alu.ufc.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Senha"
          type="password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="text-right -mt-2 mb-5">
          <a href="#" className="text-12-5 font-semibold no-underline" onClick={(e) => e.preventDefault()}>
            Esqueci minha senha
          </a>
        </div>
        {error && <p className="text-13 text-danger mb-4">{error}</p>}
        <Button type="submit" block disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="text-center mt-5 text-13 text-ink-2">
        Novo por aqui? <Link href="/cadastro" className="font-semibold no-underline">Criar conta</Link>
      </p>
    </>
  );
}
