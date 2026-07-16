'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import styles from '@/components/AuthLayout.module.css';

export default function Login() {
  const router = useRouter();

  return (
    <>
      <h1 className={styles.formTitle}>Bem-vindo de volta</h1>
      <p className={styles.formDesc}>Entre com seu e-mail institucional para acessar sua turma.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push('/');
        }}
      >
        <TextField label="E-mail" type="email" placeholder="seu.nome@alu.ufc.br" defaultValue="guilherme.farias@alu.ufc.br" required />
        <TextField label="Senha" type="password" placeholder="••••••••••" required />
        <div className={styles.forgot}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Esqueci minha senha
          </a>
        </div>
        <Button type="submit" block>
          Entrar
        </Button>
      </form>
      <p className={styles.switchLine}>
        Novo por aqui? <Link href="/cadastro">Criar conta</Link>
      </p>
    </>
  );
}
