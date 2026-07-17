import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-bg">
      <div className="hidden mid:flex mid:flex-col mid:justify-between mid:w-[42%] mid:p-10 mid:bg-gradient-cta mid:relative mid:overflow-hidden mid:text-white">
        <div className="absolute rounded-full blur-[60px] opacity-35 pointer-events-none w-[320px] h-[320px] bg-accent-2 -top-20 -right-[60px]" />
        <div className="absolute rounded-full blur-[60px] opacity-35 pointer-events-none w-[240px] h-[240px] bg-accent-3 -bottom-[60px] -left-10" />
        <div className="flex items-center gap-2.5 relative z-[1]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-white/22 border-1-5 border-white/50" />
          <span className="font-heading font-bold text-xl">QuixHub</span>
        </div>
        <div className="relative z-[1] max-w-[340px]">
          <div className="font-heading font-extrabold text-3xl leading-[1.2] mb-3.5">Estuda comigo, UFC Quixadá?</div>
          <p className="text-sm leading-[1.6] opacity-90">
            Materiais de prova, feedback real sobre disciplinas e a agenda da turma — tudo num só lugar, feito por
            quem também tá cursando.
          </p>
        </div>
        <div className="relative z-[1] flex gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="font-heading font-extrabold text-22">1.2k+</span>
            <span className="text-11-5 opacity-85">materiais</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-heading font-extrabold text-22">38</span>
            <span className="text-11-5 opacity-85">disciplinas</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-heading font-extrabold text-22">100%</span>
            <span className="text-11-5 opacity-85">anônimo</span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px]">
          <div className="flex items-center gap-2.5 mb-8 mid:hidden">
            <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-brand shadow-glow relative after:content-[''] after:absolute after:-right-[3px] after:-bottom-[3px] after:w-[13px] after:h-[13px] after:rounded after:bg-accent-2 after:border-2 after:border-bg" />
            <span className="font-heading font-bold text-19">QuixHub</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
