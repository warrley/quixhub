import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { SelectField, TextField } from '../../components/Field';
import { AuthLayout } from './AuthLayout';
import styles from './AuthLayout.module.css';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const verified = email.trim().toLowerCase().endsWith('@alu.ufc.br') || email.trim().toLowerCase().endsWith('@ufc.br');

  return (
    <AuthLayout>
      <h1 className={styles.formTitle}>Criar sua conta</h1>
      <p className={styles.formDesc}>Só alunos e professores da UFC Quixadá.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate('/');
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
          <div className={styles.verifiedRow}>
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
      <p className={styles.switchLine}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
