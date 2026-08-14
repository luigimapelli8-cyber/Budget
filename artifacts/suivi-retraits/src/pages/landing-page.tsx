import { useLocation, Redirect } from 'wouter';
import { Show } from '@clerk/react';
import { Receipt } from 'lucide-react';

export function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans flex items-center justify-center p-4 md:p-8">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex items-center justify-center gap-3 text-primary">
          <Receipt className="w-8 h-8" />
          <span className="font-mono text-sm tracking-widest uppercase font-bold">
            Carnet de suivi
          </span>
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight text-foreground">
          Suivi de retraits
        </h1>
        <p className="text-muted-foreground text-lg">
          Enregistre tes projets, suis chaque retrait avec son titre et sa provenance, et exporte
          ton registre en PDF à tout moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => navigate('/sign-up')}
            className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
          >
            Créer un compte
          </button>
          <button
            onClick={() => navigate('/sign-in')}
            className="h-14 px-8 rounded-full border border-border text-foreground font-semibold hover:border-primary/50 transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/projects" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}
