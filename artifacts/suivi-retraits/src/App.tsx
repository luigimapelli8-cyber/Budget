import { useState, useMemo, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation, useParams, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  FileDown,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Receipt,
  Minus,
  ArrowLeft,
  BookOpen,
  Pencil,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  getGetProjectQueryKey,
  getListProjectsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

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
// Home: list of saved projects
// ---------------------------------------------------------------------------

function HomePage() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

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

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20 p-4 md:p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-10">
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
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
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
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex items-center justify-between gap-4 bg-card border border-card-border rounded-2xl p-5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
            >
              <div className="min-w-0">
                <h2 className="font-serif text-2xl font-medium truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h2>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                  {formatDate(project.createdAt as unknown as string)} · {project.withdrawalCount}{' '}
                  retrait{project.withdrawalCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
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
              </div>
            </Link>
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
  url: string;
  amount: string;
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
    setRows(project.withdrawals.map((w) => ({ id: w.id, url: w.url, amount: String(w.amount) })));
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
    (id: number, field: 'amount' | 'url', value: string) => {
      const data = field === 'amount' ? { amount: parseFloat(value) || 0 } : { url: value };
      updateWithdrawal.mutate({ id, data }, { onSuccess: invalidate });
    },
    600,
  );

  const startingValue = parseFloat(startingAmount) || 0;

  const rowsWithBalance = useMemo(() => {
    let currentBalance = startingValue;
    return rows.map((row) => {
      const amount = parseFloat(row.amount) || 0;
      currentBalance -= amount;
      return { ...row, balanceAfter: currentBalance };
    });
  }, [rows, startingValue]);

  const finalBalance =
    rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].balanceAfter : startingValue;

  const addRow = () => {
    createWithdrawal.mutate(
      { id: projectId, data: { amount: 0, url: '' } },
      {
        onSuccess: (withdrawal) => {
          setRows((prev) => [...prev, { id: withdrawal.id, url: '', amount: '0' }]);
          invalidate();
        },
      },
    );
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    deleteWithdrawal.mutate({ id }, { onSuccess: invalidate });
  };

  const updateRow = (id: number, field: 'url' | 'amount', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    saveWithdrawal(id, field, value);
  };

  const handleDeleteProject = () => {
    if (!window.confirm(`Supprimer définitivement "${project?.name}" ?`)) return;
    deleteProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          navigate('/');
        },
      },
    );
  };

  const handleGeneratePDF = () => {
    if (!project) return;
    setIsGenerating(true);
    setGenerateSuccess(false);

    setTimeout(() => {
      try {
        const doc = new jsPDF();

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

        const tableBody = rowsWithBalance.map((row, idx) => [
          (idx + 1).toString().padStart(2, '0'),
          row.url || '—',
          `- ${formatCurrency(parseFloat(row.amount) || 0)}`,
          formatCurrency(row.balanceAfter),
        ]);

        autoTable(doc, {
          startY: 52,
          head: [['N°', 'Provenance (URL)', 'Retrait', 'Solde']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [166, 82, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
          bodyStyles: { textColor: [54, 49, 46] },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            2: { halign: 'right', textColor: [200, 50, 50] },
            3: { halign: 'right', fontStyle: 'bold' },
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
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tous les projets
          </Link>
          <button
            onClick={handleDeleteProject}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
          >
            Supprimer ce projet
          </button>
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
              <input
                type="number"
                value={startingAmount}
                onChange={(e) => {
                  setStartingAmount(e.target.value);
                  saveStartingAmount(e.target.value);
                }}
                className="font-mono text-4xl md:text-5xl font-bold bg-transparent border-none text-accent outline-none focus:ring-0 p-0 w-[220px] md:text-right placeholder:text-muted transition-colors focus:text-primary z-10"
                placeholder="0"
              />
              <span className="font-mono text-2xl text-accent font-bold z-10">€</span>
            </div>
          </div>
        </header>

        <main>
          <div className="hidden md:grid grid-cols-[3rem_1fr_180px_180px_4rem] gap-4 pb-4 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-widest pl-2">
            <div className="text-center">N°</div>
            <div>Provenance (URL)</div>
            <div className="text-right">Montant</div>
            <div className="text-right">Solde après</div>
            <div></div>
          </div>

          <div className="mt-4 space-y-4 md:space-y-0">
            <AnimatePresence initial={false}>
              {rows.map((row, idx) => {
                const balance = rowsWithBalance[idx].balanceAfter;
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="group overflow-hidden"
                  >
                    <div className="flex flex-col md:grid md:grid-cols-[3rem_1fr_180px_180px_4rem] items-center gap-4 py-4 md:py-3 border border-border md:border-none md:border-b rounded-2xl md:rounded-none bg-card md:bg-transparent p-5 md:p-2 hover:bg-card/40 transition-colors">
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
                        <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 md:left-0" />
                        <input
                          type="text"
                          value={row.url}
                          onChange={(e) => updateRow(row.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full pl-9 md:pl-7 py-2 bg-transparent border-b border-transparent focus:border-primary/50 outline-none transition-colors font-sans text-foreground placeholder:text-muted-foreground/40 text-base md:text-sm"
                        />
                      </div>

                      <div className="w-full relative flex items-center md:justify-end mt-2 md:mt-0">
                        <span className="md:hidden text-sm font-medium text-muted-foreground w-28 uppercase tracking-wider text-xs">
                          Retrait
                        </span>
                        <div className="flex-1 md:flex-none flex items-center md:justify-end border-b border-transparent focus-within:border-destructive/50 transition-colors pb-1">
                          <Minus className="w-3 h-3 text-destructive mr-1.5" />
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full md:w-24 text-right bg-transparent outline-none font-mono text-xl md:text-base text-destructive placeholder:text-muted-foreground/30 font-semibold"
                          />
                          <span className="font-mono text-destructive ml-1">€</span>
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
              <span className="text-sm font-semibold tracking-wide">Ajouter un retrait</span>
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/projects/:id" component={ProjectPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
