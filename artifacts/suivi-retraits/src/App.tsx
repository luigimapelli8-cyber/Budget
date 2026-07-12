import { useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, FileDown, CheckCircle2, Loader2, Link as LinkIcon, Receipt, Minus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

// Simple ID generator for local state
const generateId = () => Math.random().toString(36).substring(2, 9);

type Entry = {
  id: string;
  url: string;
  amount: string;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

function LedgerApp() {
  const [initialAmount, setInitialAmount] = useState<string>("1000");
  const [entries, setEntries] = useState<Entry[]>([
    { id: generateId(), url: "", amount: "" }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const initialValue = parseFloat(initialAmount) || 0;

  const entriesWithBalance = useMemo(() => {
    let currentBalance = initialValue;
    return entries.map(entry => {
      const amount = parseFloat(entry.amount) || 0;
      currentBalance -= amount;
      return { ...entry, balanceAfter: currentBalance };
    });
  }, [entries, initialValue]);

  const finalBalance = entriesWithBalance.length > 0 
    ? entriesWithBalance[entriesWithBalance.length - 1].balanceAfter 
    : initialValue;

  const addEntry = () => {
    setEntries(prev => [...prev, { id: generateId(), url: "", amount: "" }]);
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof Entry, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    setGenerateSuccess(false);
    
    setTimeout(() => {
      try {
        const doc = new jsPDF();

        // Title and Meta
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(54, 49, 46); // Matches --foreground
        doc.text("Registre des retraits", 14, 25);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 32);

        // Initial Balance
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(77, 128, 92); // Matches --accent (Money Green)
        doc.text(`Somme de départ : ${formatCurrency(initialValue)}`, 14, 45);

        // Table Data
        const tableBody = entriesWithBalance.map((entry, idx) => [
          (idx + 1).toString().padStart(2, '0'),
          entry.url || '—',
          `- ${formatCurrency(parseFloat(entry.amount) || 0)}`,
          formatCurrency(entry.balanceAfter)
        ]);

        autoTable(doc, {
          startY: 52,
          head: [['N°', 'Provenance (URL)', 'Retrait', 'Solde']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [166, 82, 61], textColor: [255, 255, 255], fontStyle: 'bold' }, // Matches --primary (Terracotta)
          bodyStyles: { textColor: [54, 49, 46] },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            2: { halign: 'right', textColor: [200, 50, 50] },
            3: { halign: 'right', fontStyle: 'bold' }
          },
          alternateRowStyles: { fillColor: [249, 246, 240] } // Matches --background
        });

        let finalY = (doc as any).lastAutoTable.finalY || 55;
        
        // Defensive check to avoid text clipping on pagination
        if (finalY > doc.internal.pageSize.height - 30) {
          doc.addPage();
          finalY = 20;
        }

        // Final Balance
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(54, 49, 46);
        doc.text(`Solde final : ${formatCurrency(finalBalance)}`, 14, finalY + 20);

        doc.save("registre-retraits.pdf");
        
        setGenerateSuccess(true);
        setTimeout(() => setGenerateSuccess(false), 3000);
      } catch (err) {
        console.error("Failed to generate PDF", err);
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20 p-4 md:p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border">
          <div>
            <div className="flex items-center gap-3 mb-2 text-primary">
              <Receipt className="w-6 h-6" />
              <span className="font-mono text-sm tracking-widest uppercase font-bold">Carnet de suivi</span>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight text-foreground">
              Registre
            </h1>
          </div>
          
          <div className="flex flex-col items-start md:items-end bg-card p-5 rounded-2xl border border-card-border shadow-sm w-full md:w-auto relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Somme de départ
            </label>
            <div className="flex items-baseline gap-2 relative">
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="font-mono text-4xl md:text-5xl font-bold bg-transparent border-none text-accent outline-none focus:ring-0 p-0 w-[220px] md:text-right placeholder:text-muted transition-colors focus:text-primary z-10"
                placeholder="0"
              />
              <span className="font-mono text-2xl text-accent font-bold z-10">€</span>
            </div>
          </div>
        </header>

        <main>
          {/* Desktop List Header */}
          <div className="hidden md:grid grid-cols-[3rem_1fr_180px_180px_4rem] gap-4 pb-4 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-widest pl-2">
            <div className="text-center">N°</div>
            <div>Provenance (URL)</div>
            <div className="text-right">Montant</div>
            <div className="text-right">Solde après</div>
            <div></div>
          </div>

          <div className="mt-4 space-y-4 md:space-y-0">
            <AnimatePresence initial={false}>
              {entries.map((entry, idx) => {
                const balance = entriesWithBalance[idx].balanceAfter;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="group overflow-hidden"
                  >
                    <div className="flex flex-col md:grid md:grid-cols-[3rem_1fr_180px_180px_4rem] items-center gap-4 py-4 md:py-3 border border-border md:border-none md:border-b rounded-2xl md:rounded-none bg-card md:bg-transparent p-5 md:p-2 hover:bg-card/40 transition-colors">
                      
                      {/* Index Desktop */}
                      <div className="hidden md:block text-center font-mono text-sm text-muted-foreground font-medium">
                        {(idx + 1).toString().padStart(2, '0')}
                      </div>

                      {/* Header Mobile */}
                      <div className="md:hidden w-full flex justify-between items-center mb-2 pb-3 border-b border-border/60">
                        <span className="font-mono text-sm text-muted-foreground font-bold tracking-widest uppercase">Ligne {(idx + 1).toString().padStart(2, '0')}</span>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* URL Input */}
                      <div className="w-full relative flex items-center">
                        <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 md:left-0" />
                        <input
                          type="text"
                          value={entry.url}
                          onChange={(e) => updateEntry(entry.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full pl-9 md:pl-7 py-2 bg-transparent border-b border-transparent focus:border-primary/50 outline-none transition-colors font-sans text-foreground placeholder:text-muted-foreground/40 text-base md:text-sm"
                        />
                      </div>

                      {/* Amount Input */}
                      <div className="w-full relative flex items-center md:justify-end mt-2 md:mt-0">
                        <span className="md:hidden text-sm font-medium text-muted-foreground w-28 uppercase tracking-wider text-xs">Retrait</span>
                        <div className="flex-1 md:flex-none flex items-center md:justify-end border-b border-transparent focus-within:border-destructive/50 transition-colors pb-1">
                          <Minus className="w-3 h-3 text-destructive mr-1.5" />
                          <input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full md:w-24 text-right bg-transparent outline-none font-mono text-xl md:text-base text-destructive placeholder:text-muted-foreground/30 font-semibold"
                          />
                          <span className="font-mono text-destructive ml-1">€</span>
                        </div>
                      </div>

                      {/* Balance Display */}
                      <div className="w-full flex items-center md:justify-end mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border/60 md:border-none">
                        <span className="md:hidden text-sm font-medium text-muted-foreground w-28 uppercase tracking-wider text-xs">Solde après</span>
                        <div className={`flex-1 md:flex-none text-right font-mono text-xl md:text-base font-bold ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {formatCurrency(balance)}
                        </div>
                      </div>

                      {/* Delete Action Desktop */}
                      <div className="hidden md:flex justify-center">
                        <button
                          onClick={() => removeEntry(entry.id)}
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

          {/* Add Row Button */}
          <div className="mt-8 flex justify-center md:justify-start">
            <button
              onClick={addEntry}
              className="group flex items-center gap-3 px-5 py-2.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 hover:shadow-sm transition-all duration-300"
            >
              <div className="bg-primary/10 text-primary rounded-full p-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="w-4 h-4" />
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
              className={`text-6xl md:text-7xl font-mono font-bold mt-2 tracking-tighter ${finalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}
            >
              {formatCurrency(finalBalance)}
            </motion.div>
          </div>
          
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || generateSuccess}
            className={`
              relative overflow-hidden w-full md:w-auto flex items-center justify-center gap-3 h-16 px-10 rounded-full text-lg font-semibold transition-all duration-300 shadow-lg
              ${generateSuccess 
                ? 'bg-accent text-accent-foreground shadow-accent/20 cursor-default scale-95' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-1'
              }
              ${isGenerating ? 'opacity-90 pointer-events-none cursor-wait scale-95' : ''}
            `}
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div key="loading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Génération...</span>
                </motion.div>
              ) : generateSuccess ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Document enregistré</span>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3">
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
      <Route path="/" component={LedgerApp} />
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
