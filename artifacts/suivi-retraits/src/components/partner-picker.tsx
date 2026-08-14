import { useState } from 'react';
import { Loader2, UserSearch, X } from 'lucide-react';
import {
  useSearchPartners,
  getSearchPartnersQueryKey,
  type Partner,
} from '@workspace/api-client-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { partnerInitials } from '@/lib/format';

// Search-and-select field to link a transaction to another real account on the
// site (found by email), showing their Google profile photo when available.
export function PartnerPicker({
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
