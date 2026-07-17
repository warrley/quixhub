'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';

export default function Login() {
  const router = useRouter();

  return (
    <>
      <h1 className="font-heading font-bold text-25 mb-1.5">Bem-vindo de volta</h1>
      <p className="text-13-5 text-ink-2 mb-6 leading-[1.5]">Entre com seu e-mail institucional para acessar sua turma.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push('/');
        }}
      >
        <TextField label="E-mail" type="email" placeholder="seu.nome@alu.ufc.br" defaultValue="guilherme.farias@alu.ufc.br" required />
        <TextField label="Senha" type="password" placeholder="••••••••••" required />
        <div className="text-right -mt-2 mb-5">
          <a href="#" className="text-12-5 font-semibold no-underline" onClick={(e) => e.preventDefault()}>
            Esqueci minha senha
          </a>
        </div>
        <Button type="submit" block>
          Entrar
        </Button>
      </form>
      <p className="text-center mt-5 text-13 text-ink-2">
        Novo por aqui? <Link href="/cadastro" className="font-semibold no-underline">Criar conta</Link>
      </p>
    </>
  );
}
