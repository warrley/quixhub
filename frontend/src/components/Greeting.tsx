'use client';

import { useEffect, useState } from 'react';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Bom dia,';
  if (hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

export function Greeting() {
  const [text, setText] = useState('Olá,');

  useEffect(() => {
    setText(greetingForHour(new Date().getHours()));
  }, []);

  return <>{text}</>;
}
