import { useState, useMemo, useEffect, useRef } from 'react';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation, useParams, Redirect } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Plus,
  Trash2,
  FileDown,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Receipt,
  ArrowLeft,
  BookOpen,
  Pencil,
  LogOut,
  Tag,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Wallet,
  UserSearch,
  X,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import {
  useListProjects,
  useCreateProject,
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useCreateWithdrawal,
  useUpdateWithdrawal,
  useDeleteWithdrawal,
  useSearchPartners,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  getSearchPartnersQueryKey,
} from '@workspace/api-client-react';
import type { Partner, PaymentMethod, TransactionType } from '@workspace/api-client-react';
import { queryClient } from '@/lib/queryClient';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Clerk wiring — copied verbatim per clerk-auth skill conventions.
// ---------------------------------------------------------------------------

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#A6523D',
    colorForeground: '#36312E',
    colorMutedForeground: '#78716C',
    colorDanger: '#B33A3A',
    colorBackground: '#F9F6F0',
    colorInput: '#FFFFFF',
    colorInputForeground: '#36312E',
    colorNeutral: '#D9D2C7',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-card rounded-2xl w-[440px] max-w-full overflow-hidden border border-card-border',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-serif text-3xl text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground font-semibold',
    formFieldLabel: 'text-foreground font-medium',
    footerActionLink: 'text-primary font-semibold hover:text-primary/80',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-accent',
    alertText: 'text-destructive',
    logoBox: 'flex justify-center py-2',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border border-border hover:bg-muted/40',
    formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    formFieldInput: 'bg-input text-foreground border border-border',
    footerAction: 'text-center',
    dividerLine: 'bg-border',
    alert: 'bg-destructive/10 border border-destructive/30',
    otpCodeFieldInput: 'border border-border',
    formFieldRow: '',
    main: '',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

// Groups the integer part of a raw number string by thousands with a plain space,
// e.g. "1000000" -> "1 000 000". Keeps a single decimal separator (comma or dot) intact.
const groupThousands = (integerPart: string) => integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const formatAmountInput = (raw: string) => {
  if (!raw) return '';
  const negative = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  let integerPart = cleaned;
  let decimalPart = '';
  if (sepIndex !== -1) {
    integerPart = cleaned.slice(0, sepIndex);
    decimalPart = cleaned[sepIndex] + cleaned.slice(sepIndex + 1).replace(/[^\d]/g, '');
  }
  integerPart = integerPart.replace(/^0+(?=\d)/, '');
  return `${negative ? '-' : ''}${groupThousands(integerPart)}${decimalPart}`;
};

// Controlled text input that displays a live "1 000 000"-style grouped value while
// storing/emitting a plain numeric string (dot as decimal separator) via onValueChange.
function AmountInput({
  value,
  onValueChange,
  className,
  placeholder,
  autoFocus,
}: {
  value: string;
  onValueChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      value={formatAmountInput(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/\s/g, '').replace(',', '.');
        onValueChange(raw.replace(/[^0-9.-]/g, ''));
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Transaction dates are stored as timestamps but only the calendar day matters here,
// so both the <input type="date"> value and the display use UTC to avoid off-by-one
// day shifts from the browser's local timezone.
const dateToInputValue = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

const formatDateShort = (date: Date | string) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  carte_debit: 'Carte de débit',
  cheque: 'Chèque',
  virement: 'Virement',
  cash: 'Cash / Liquide',
  cheque_vacances: 'Chèque vacances',
  carte_resto: 'Carte resto / Pass',
  autre: 'Autre',
};

const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];

function partnerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

// Search-and-select field to link a transaction to another real account on the
// site (found by email), showing their Google profile photo when available.
function PartnerPicker({
  value,
  onChange,
}: {
  value: Partner | null;
  onChange: (partner: Partner | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const setDebouncedQueryLater = useDebouncedCallback(setDebouncedQuery, 300);

  const { data: results, isFetching } = useSearchPartners(
    { q: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.trim().length >= 2,
        queryKey: getSearchPartnersQueryKey({ q: debouncedQuery }),
      },
    },
  );

  if (value) {
    return (
      <div className="flex items-center gap-2 bg-muted/40 rounded-full pl-1 pr-2 py-1 w-fit max-w-full">
        <Avatar className="h-6 w-6">
          <AvatarImage src={value.imageUrl} alt={value.name} />
          <AvatarFallback className="text-[10px] font-semibold">
            {partnerInitials(value.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground truncate max-w-[9rem]">
          {value.name}
        </span>
        <button
          onClick={() => onChange(null)}
          className="text-muted-foreground/60 hover:text-destructive transition-colors"
          title="Retirer le partenaire"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <UserSearch className="w-4 h-4" />
          Associer un partenaire
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDebouncedQueryLater(e.target.value);
          }}
          placeholder="Rechercher par e-mail..."
          className="w-full px-3 py-2 text-sm bg-muted/40 rounded-lg outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
          {isFetching && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {!isFetching && debouncedQuery.trim().length >= 2 && results?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucun compte trouvé pour "{debouncedQuery}".
            </p>
          )}
          {!isFetching && debouncedQuery.trim().length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Tape au moins 2 caractères de l'e-mail du partenaire.
            </p>
          )}
          {results?.map((partner) => (
            <button
              key={partner.id}
              onClick={() => {
                onChange(partner);
                setOpen(false);
                setQuery('');
                setDebouncedQuery('');
              }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={partner.imageUrl} alt={partner.name} />
                <AvatarFallback className="text-[10px] font-semibold">
                  {partnerInitials(partner.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{partner.name}</div>
                {partner.email && (
                  <div className="text-xs text-muted-foreground truncate">{partner.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function useDebouncedCallback<T extends (...args: never[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
  };
}

// ---------------------------------------------------------------------------
// Landing page (signed-out home)
// ---------------------------------------------------------------------------

function LandingPage() {
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

function HomeRedirect() {
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

// ---------------------------------------------------------------------------
// Projects list (protected)
// ---------------------------------------------------------------------------

function AccountBadge() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden md:inline">
        {user?.primaryEmailAddress?.emailAddress ?? user?.fullName}
      </span>
      <button
        onClick={() => signOut({ redirectUrl: basePath || '/' })}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
        title="Se déconnecter"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden md:inline">Déconnexion</span>
      </button>
    </div>
  );
}

function ProjectsListPage() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createProject.mutate(
      { data: { name: newName.trim(), startingAmount: parseFloat(newAmount) || 0 } },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setIsCreating(false);
          setNewName('');
          setNewAmount('');
          navigate(`/projects/${project.id}`);
        },
      },
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Supprimer définitivement "${name}" ?`)) return;
    deleteProject.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }) },
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20 p-4 md:p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex justify-end">
          <AccountBadge />
        </div>

        <header className="flex items-center justify-between gap-6 pb-8 border-b border-border">
          <div>
            <div className="flex items-center gap-3 mb-2 text-primary">
              <BookOpen className="w-6 h-6" />
              <span className="font-mono text-sm tracking-widest uppercase font-bold">
                Registres
              </span>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight text-foreground">
              Mes projets
            </h1>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="hidden md:flex items-center gap-3 h-14 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouveau projet
          </button>
        </header>

        <AnimatePresence>
          {isCreating && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="overflow-hidden"
            >
              <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nom du projet
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex : Cagnotte vacances"
                    className="w-full mt-1 bg-transparent border-b-2 border-border focus:border-primary outline-none py-2 text-lg font-medium transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Somme de départ
                  </label>
                  <div className="flex items-baseline gap-2">
                    <AmountInput
                      value={newAmount}
                      onValueChange={setNewAmount}
                      placeholder="0"
                      className="w-full mt-1 bg-transparent border-b-2 border-border focus:border-primary outline-none py-2 text-lg font-mono font-bold text-accent transition-colors"
                    />
                    <span className="font-mono text-accent font-bold">€</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!newName.trim() || createProject.isPending}
                    className="flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {createProject.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="h-11 px-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsCreating(true)}
          className="md:hidden w-full flex items-center justify-center gap-3 h-14 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nouveau projet
        </button>

        <main className="space-y-3">
          {isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Chargement des registres...
            </div>
          )}

          {!isLoading && projects && projects.length === 0 && (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun registre pour l'instant.</p>
              <p className="text-sm text-muted-foreground/70">
                Crée ton premier projet pour commencer à suivre tes retraits.
              </p>
            </div>
          )}

          {projects?.map((project) => (
            <div
              key={project.id}
              className="group flex items-center justify-between gap-4 bg-card border border-card-border rounded-2xl p-5 hover:shadow-md hover:border-primary/40 transition-all"
            >
              <button
                onClick={() => navigate(`/projects/${project.id}`)}
                className="min-w-0 text-left flex-1"
              >
                <h2 className="font-serif text-2xl font-medium truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h2>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                  {formatDate(project.createdAt as unknown as string)} · {project.withdrawalCount}{' '}
                  retrait{project.withdrawalCount > 1 ? 's' : ''}
                </p>
              </button>
              <button
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-right shrink-0"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Solde
                </div>
                <div
                  className={`font-mono text-2xl font-bold ${
                    project.finalBalance < 0 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {formatCurrency(project.finalBalance)}
                </div>
              </button>
              <button
                onClick={() => handleDelete(project.id, project.name)}
                className="shrink-0 text-muted-foreground/40 hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors"
                title="Supprimer ce projet"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project detail: the ledger
// ---------------------------------------------------------------------------

type RowState = {
  id: number;
  title: string;
  url: string;
  amount: string;
  type: TransactionType;
  date: string; // yyyy-mm-dd, see dateToInputValue
  paymentMethod: PaymentMethod;
  partner: Partner | null;
};

function ProjectPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createWithdrawal = useCreateWithdrawal();
  const updateWithdrawal = useUpdateWithdrawal();
  const deleteWithdrawal = useDeleteWithdrawal();

  const [projectName, setProjectName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [startingAmount, setStartingAmount] = useState('0');
  const [rows, setRows] = useState<RowState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  useEffect(() => {
    if (!project) return;
    setProjectName(project.name);
    setStartingAmount(String(project.startingAmount));
    setRows(
      project.withdrawals.map((w) => ({
        id: w.id,
        title: w.title,
        url: w.url,
        amount: String(w.amount),
        type: w.type,
        date: dateToInputValue(w.date),
        paymentMethod: w.paymentMethod,
        partner: w.partner,
      })),
    );
  }, [project]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const saveStartingAmount = useDebouncedCallback((value: string) => {
    const amount = parseFloat(value) || 0;
    updateProject.mutate({ id: projectId, data: { startingAmount: amount } }, { onSuccess: invalidate });
  }, 600);

  const saveName = useDebouncedCallback((value: string) => {
    if (!value.trim()) return;
    updateProject.mutate({ id: projectId, data: { name: value.trim() } }, { onSuccess: invalidate });
  }, 600);

  const saveWithdrawal = useDebouncedCallback(
    (id: number, field: 'title' | 'amount' | 'url', value: string) => {
      const data =
        field === 'amount'
          ? { amount: parseFloat(value) || 0 }
          : field === 'title'
            ? { title: value }
            : { url: value };
      updateWithdrawal.mutate({ id, data }, { onSuccess: invalidate });
    },
    600,
  );

  // Non-debounced: used for discrete field changes (type toggle, date, payment
  // method, partner) that don't benefit from waiting for the user to stop typing.
  const patchWithdrawal = (
    id: number,
    data: Partial<{
      type: TransactionType;
      date: string;
      paymentMethod: PaymentMethod;
      partnerUserId: string | null;
    }>,
  ) => {
    updateWithdrawal.mutate({ id, data }, { onSuccess: invalidate });
  };

  const startingValue = parseFloat(startingAmount) || 0;

  const rowsWithBalance = useMemo(() => {
    let currentBalance = startingValue;
    return rows.map((row) => {
      const amount = parseFloat(row.amount) || 0;
      currentBalance += row.type === 'deposit' ? amount : -amount;
      return { ...row, balanceAfter: currentBalance };
    });
  }, [rows, startingValue]);

  const finalBalance =
    rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].balanceAfter : startingValue;

  const addRow = () => {
    const today = dateToInputValue(new Date());
    createWithdrawal.mutate(
      { id: projectId, data: { title: '', amount: 0, url: '', type: 'withdrawal', paymentMethod: 'cash' } },
      {
        onSuccess: (withdrawal) => {
          setRows((prev) => [
            ...prev,
            {
              id: withdrawal.id,
              title: '',
              url: '',
              amount: '0',
              type: 'withdrawal',
              date: today,
              paymentMethod: 'cash',
              partner: null,
            },
          ]);
          invalidate();
        },
      },
    );
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    deleteWithdrawal.mutate({ id }, { onSuccess: invalidate });
  };

  const updateRow = (id: number, field: 'title' | 'url' | 'amount', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    saveWithdrawal(id, field, value);
  };

  const updateRowType = (id: number, type: TransactionType) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, type } : r)));
    patchWithdrawal(id, { type });
  };

  const updateRowDate = (id: number, date: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, date } : r)));
    if (!date) return;
    patchWithdrawal(id, { date: new Date(`${date}T00:00:00.000Z`).toISOString() });
  };

  const updateRowPaymentMethod = (id: number, paymentMethod: PaymentMethod) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, paymentMethod } : r)));
    patchWithdrawal(id, { paymentMethod });
  };

  const updateRowPartner = (id: number, partner: Partner | null) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, partner } : r)));
    patchWithdrawal(id, { partnerUserId: partner?.id ?? null });
  };

  const handleDeleteProject = () => {
    if (!window.confirm(`Supprimer définitivement "${project?.name}" ?`)) return;
    deleteProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          navigate('/projects');
        },
      },
    );
  };

  const handleGeneratePDF = () => {
    if (!project) return;
    setIsGenerating(true);
    setGenerateSuccess(false);

    setTimeout(async () => {
      try {
        // Loaded on demand: jsPDF + autotable are ~230KB gzipped and only needed here,
        // so they're kept out of the main bundle to speed up initial page load.
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(54, 49, 46);
        doc.text(projectName || 'Registre des retraits', 14, 25);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
          14,
          32,
        );

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(77, 128, 92);
        doc.text(`Somme de départ : ${formatCurrency(startingValue)}`, 14, 45);

        const tableBody = rowsWithBalance.map((row, idx) => {
          const amount = parseFloat(row.amount) || 0;
          const isDeposit = row.type === 'deposit';
          return [
            (idx + 1).toString().padStart(2, '0'),
            formatDateShort(new Date(`${row.date}T00:00:00.000Z`)),
            row.title || '—',
            isDeposit ? 'Ajout' : 'Retrait',
            row.url || '—',
            PAYMENT_METHOD_LABELS[row.paymentMethod],
            row.partner?.name || '—',
            `${isDeposit ? '+' : '-'} ${formatCurrency(amount)}`,
            formatCurrency(row.balanceAfter),
          ];
        });

        autoTable(doc, {
          startY: 52,
          head: [
            ['N°', 'Date', 'Titre', 'Type', 'Provenance (URL)', 'Mode', 'Partenaire', 'Montant', 'Solde'],
          ],
          body: tableBody,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [166, 82, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
          bodyStyles: { textColor: [54, 49, 46] },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            7: { halign: 'right' },
            8: { halign: 'right', fontStyle: 'bold' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 7) {
              const isDeposit = tableBody[data.row.index]?.[3] === 'Ajout';
              data.cell.styles.textColor = isDeposit ? [77, 128, 92] : [200, 50, 50];
            }
          },
          alternateRowStyles: { fillColor: [249, 246, 240] },
        });

        let finalY = (doc as any).lastAutoTable.finalY || 55;

        if (finalY > doc.internal.pageSize.height - 30) {
          doc.addPage();
          finalY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(54, 49, 46);
        doc.text(`Solde final : ${formatCurrency(finalBalance)}`, 14, finalY + 20);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
          'Site créé par Luigi MAPELLI',
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' },
        );

        doc.save(`${(projectName || 'registre').toLowerCase().replace(/\s+/g, '-')}.pdf`);

        setGenerateSuccess(true);
        setTimeout(() => setGenerateSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to generate PDF', err);
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20 p-4 md:p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tous les projets
          </button>
          <div className="flex items-center gap-6">
            <button
              onClick={handleDeleteProject}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
            >
              Supprimer ce projet
            </button>
            <AccountBadge />
          </div>
        </div>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border">
          <div>
            <div className="flex items-center gap-3 mb-2 text-primary">
              <Receipt className="w-6 h-6" />
              <span className="font-mono text-sm tracking-widest uppercase font-bold">Carnet de suivi</span>
            </div>
            {isEditingName ? (
              <input
                autoFocus
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  saveName(e.target.value);
                }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className="font-serif text-5xl md:text-6xl font-medium tracking-tight text-foreground bg-transparent border-b-2 border-primary outline-none"
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-3 text-left"
              >
                <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight text-foreground">
                  {projectName}
                </h1>
                <Pencil className="w-5 h-5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end bg-card p-5 rounded-2xl border border-card-border shadow-sm w-full md:w-auto relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Somme de départ
            </label>
            <div className="flex items-baseline gap-2 relative">
              <AmountInput
                value={startingAmount}
                onValueChange={(value) => {
                  setStartingAmount(value);
                  saveStartingAmount(value);
                }}
                className="font-mono text-4xl md:text-5xl font-bold bg-transparent border-none text-accent outline-none focus:ring-0 p-0 w-[220px] md:text-right placeholder:text-muted transition-colors focus:text-primary z-10"
                placeholder="0"
              />
              <span className="font-mono text-2xl text-accent font-bold z-10">€</span>
            </div>
          </div>
        </header>

        <main>
          <div className="hidden md:grid grid-cols-[3rem_180px_1fr_150px_150px_4rem] gap-4 pb-4 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-widest pl-2">
            <div className="text-center">N°</div>
            <div>Titre</div>
            <div>Provenance (URL)</div>
            <div className="text-right">Montant</div>
            <div className="text-right">Solde après</div>
            <div></div>
          </div>

          <div className="mt-4 space-y-4 md:space-y-0">
            <AnimatePresence initial={false}>
              {rows.map((row, idx) => {
                const balance = rowsWithBalance[idx].balanceAfter;
                const isDeposit = row.type === 'deposit';
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="group overflow-hidden"
                  >
                    <div className="border border-border md:border-none md:border-b rounded-2xl md:rounded-none bg-card md:bg-transparent hover:bg-card/40 transition-colors">
                      <div className="flex flex-col md:grid md:grid-cols-[3rem_180px_1fr_150px_150px_4rem] items-center gap-4 py-4 md:py-3 p-5 md:p-2">
                        <div className="hidden md:block text-center font-mono text-sm text-muted-foreground font-medium">
                          {(idx + 1).toString().padStart(2, '0')}
                        </div>

                        <div className="md:hidden w-full flex justify-between items-center mb-2 pb-3 border-b border-border/60">
                          <span className="font-mono text-sm text-muted-foreground font-bold tracking-widest uppercase">
                            Ligne {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <button
                            onClick={() => removeRow(row.id)}
                            className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="w-full relative flex items-center">
                          <Tag className="w-4 h-4 text-muted-foreground absolute left-3 md:left-0" />
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                            placeholder="Ex : Loyer"
                            className="w-full pl-9 md:pl-7 py-2 bg-transparent border-b border-transparent focus:border-primary/50 outline-none transition-colors font-sans font-medium text-foreground placeholder:text-muted-foreground/40 text-base md:text-sm"
                          />
                        </div>

                        <div className="w-full relative flex items-center">
                          <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 md:left-0" />
                          <input
                            type="text"
                            value={row.url}
                            onChange={(e) => updateRow(row.id, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full pl-9 md:pl-7 py-2 bg-transparent border-b border-transparent focus:border-primary/50 outline-none transition-colors font-sans text-foreground placeholder:text-muted-foreground/40 text-base md:text-sm"
                          />
                        </div>

                        <div className="w-full flex items-center md:justify-end gap-2 mt-2 md:mt-0">
                          <div className="flex items-center rounded-full border border-border overflow-hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => updateRowType(row.id, 'withdrawal')}
                              title="Retrait"
                              className={`p-1.5 transition-colors ${
                                !isDeposit
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'text-muted-foreground/40 hover:text-destructive'
                              }`}
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRowType(row.id, 'deposit')}
                              title="Ajout d'argent"
                              className={`p-1.5 transition-colors border-l border-border ${
                                isDeposit
                                  ? 'bg-accent/10 text-accent'
                                  : 'text-muted-foreground/40 hover:text-accent'
                              }`}
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <div
                            className={`flex-1 md:flex-none flex items-center md:justify-end border-b transition-colors pb-1 ${
                              isDeposit
                                ? 'border-transparent focus-within:border-accent/50'
                                : 'border-transparent focus-within:border-destructive/50'
                            }`}
                          >
                            <AmountInput
                              value={row.amount}
                              onValueChange={(value) => updateRow(row.id, 'amount', value)}
                              placeholder="0"
                              className={`w-full md:w-20 text-right bg-transparent outline-none font-mono text-xl md:text-base placeholder:text-muted-foreground/30 font-semibold ${
                                isDeposit ? 'text-accent' : 'text-destructive'
                              }`}
                            />
                            <span
                              className={`font-mono ml-1 ${isDeposit ? 'text-accent' : 'text-destructive'}`}
                            >
                              €
                            </span>
                          </div>
                        </div>

                        <div className="w-full flex items-center md:justify-end mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border/60 md:border-none">
                          <span className="md:hidden text-sm font-medium text-muted-foreground w-28 uppercase tracking-wider text-xs">
                            Solde après
                          </span>
                          <div
                            className={`flex-1 md:flex-none text-right font-mono text-xl md:text-base font-bold ${
                              balance < 0 ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {formatCurrency(balance)}
                          </div>
                        </div>

                        <div className="hidden md:flex justify-center">
                          <button
                            onClick={() => removeRow(row.id)}
                            className="text-muted-foreground/40 hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 md:pl-[calc(3rem+1rem)] md:pr-2 pb-4 md:pb-3 -mt-1 md:mt-0">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRowDate(row.id, e.target.value)}
                            className="bg-transparent text-sm text-foreground outline-none border-b border-transparent focus:border-primary/50 py-1 transition-colors"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                          <Select
                            value={row.paymentMethod}
                            onValueChange={(value) =>
                              updateRowPaymentMethod(row.id, value as PaymentMethod)
                            }
                          >
                            <SelectTrigger className="h-8 w-[170px] border-none shadow-none bg-transparent px-0 text-sm focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHOD_OPTIONS.map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <PartnerPicker
                          value={row.partner}
                          onChange={(partner) => updateRowPartner(row.id, partner)}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-center md:justify-start">
            <button
              onClick={addRow}
              disabled={createWithdrawal.isPending}
              className="group flex items-center gap-3 px-5 py-2.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 hover:shadow-sm transition-all duration-300 disabled:opacity-60"
            >
              <div className="bg-primary/10 text-primary rounded-full p-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {createWithdrawal.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-semibold tracking-wide">Ajouter une transaction</span>
            </button>
          </div>
        </main>

        <footer className="mt-20 pt-10 border-t border-border flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-center md:text-left w-full md:w-auto">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Solde final</h3>
            <motion.div
              key={finalBalance}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-6xl md:text-7xl font-mono font-bold mt-2 tracking-tighter ${
                finalBalance < 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatCurrency(finalBalance)}
            </motion.div>
          </div>

          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || generateSuccess}
            className={`
              relative overflow-hidden w-full md:w-auto flex items-center justify-center gap-3 h-16 px-10 rounded-full text-lg font-semibold transition-all duration-300 shadow-lg
              ${
                generateSuccess
                  ? 'bg-accent text-accent-foreground shadow-accent/20 cursor-default scale-95'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-1'
              }
              ${isGenerating ? 'opacity-90 pointer-events-none cursor-wait scale-95' : ''}
            `}
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3"
                >
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Génération...</span>
                </motion.div>
              ) : generateSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Document enregistré</span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3"
                >
                  <FileDown className="w-6 h-6" />
                  <span>Générer le PDF</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </footer>
      </div>
    </div>
  );
}

function ProtectedProjectsListPage() {
  return (
    <>
      <Show when="signed-in">
        <ProjectsListPage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ProtectedProjectPage() {
  return (
    <>
      <Show when="signed-in">
        <ProjectPage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Bon retour',
            subtitle: 'Connecte-toi pour retrouver tes registres',
          },
        },
        signUp: {
          start: {
            title: 'Crée ton compte',
            subtitle: 'Commence à suivre tes retraits dès aujourd\u2019hui',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/projects" component={ProtectedProjectsListPage} />
          <Route path="/projects/:id" component={ProtectedProjectPage} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
