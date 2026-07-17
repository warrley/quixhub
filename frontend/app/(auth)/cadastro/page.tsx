'use client';

import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const verified = email.trim().toLowerCase().endsWith('@alu.ufc.br') || email.trim().toLowerCase().endsWith('@ufc.br');

  return (
    <>
      <h1 className="font-heading font-bold text-25 mb-1.5">Criar sua conta</h1>
      <p className="text-13-5 text-ink-2 mb-6 leading-[1.5]">Só alunos e professores da UFC Quixadá.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push('/');
        }}
      >
        <TextField label="Nome completo" placeholder="Seu nome" required />
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
        <TextField label="Senha" type="password" placeholder="••••••••••" required />
        <SelectField label="Curso" defaultValue="Engenharia de Software">
          <option>Engenharia de Software</option>
          <option>Ciência da Computação</option>
          <option>Sistemas de Informação</option>
          <option>Engenharia da Computação</option>
        </SelectField>
        <Button type="submit" block>
          Criar conta
        </Button>
      </form>
      <p className="text-center mt-5 text-13 text-ink-2">
        Já tem conta? <Link href="/login" className="font-semibold no-underline">Entrar</Link>
      </p>
    </>
  );
}
