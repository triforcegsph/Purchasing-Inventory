import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

export interface TypeAheadOption {
  value: string;
  label: string;
  sublabel?: string;
  category?: string;
  keywords?: string[];
}

interface BaseProps {
  options: TypeAheadOption[];
  placeholder?: string;
  emptyMessage?: string;
  allowManual?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  maxResults?: number;
}

interface SingleModeProps extends BaseProps {
  mode?: 'single';
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: TypeAheadOption) => void;
}

interface ChipsModeProps extends BaseProps {
  mode: 'chips';
  values: string[];
  onChangeValues: (values: string[]) => void;
  onSelectOption?: (option: TypeAheadOption) => void;
}

export type LiveTypeAheadProps = SingleModeProps | ChipsModeProps;

/** Renders text with case-insensitive partial match highlighted. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lowerText.indexOf(lowerQ);
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-[#bae6fd] text-[#0c4a6e] font-semibold rounded-[2px] px-0.5">{match}</mark>
      {after}
    </>
  );
}

/**
 * Reusable Live Type-Ahead Suggestion input supporting single-value and multi-chip modes,
 * keyboard navigation (ArrowUp, ArrowDown, Enter, Escape), match highlighting, and deduplication.
 */
export function LiveTypeAhead(props: LiveTypeAheadProps) {
  const {
    options,
    placeholder = 'Type to search...',
    emptyMessage = 'No matching results found.',
    allowManual = true,
    loading = false,
    disabled = false,
    className = '',
    inputClassName = '',
    maxResults = 30,
  } = props;

  const isChips = props.mode === 'chips';
  const [query, setQuery] = useState(isChips ? '' : props.value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isChips) {
      setQuery(props.value);
    }
  }, [isChips, isChips ? '' : props.value]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Deduplicate options by value (case-insensitive) and filter against query
  const filtered = useMemo(() => {
    const seen = new Set<string>();
    const deduped: TypeAheadOption[] = [];
    for (const opt of options) {
      const k = opt.value.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      deduped.push(opt);
    }

    const q = (isChips ? query : query).trim().toLowerCase();
    const matched = q
      ? deduped.filter((opt) => {
          if (opt.label.toLowerCase().includes(q)) return true;
          if (opt.value.toLowerCase().includes(q)) return true;
          if (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) return true;
          if (opt.keywords && opt.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
          return false;
        })
      : deduped;

    return matched.slice(0, maxResults);
  }, [options, query, isChips, maxResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, filtered.length]);

  // Group filtered options by category while preserving order
  const grouped = useMemo(() => {
    const map = new Map<string, TypeAheadOption[]>();
    for (const opt of filtered) {
      const cat = opt.category || '';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleSelect = (opt: TypeAheadOption) => {
    if (isChips) {
      if (!props.values.includes(opt.value)) {
        props.onChangeValues([...props.values, opt.value]);
      }
      setQuery('');
      props.onSelectOption?.(opt);
    } else {
      setQuery(opt.value);
      props.onChange(opt.value);
      props.onSelectOption?.(opt);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filtered.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen && filtered.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filtered[activeIndex]) {
        e.preventDefault();
        handleSelect(filtered[activeIndex]);
      } else if (isChips && allowManual && query.trim()) {
        e.preventDefault();
        const manual = query.trim();
        if (!props.values.includes(manual)) {
          props.onChangeValues([...props.values, manual]);
        }
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (isChips) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div
          className={`min-h-[44px] p-2 border rounded-md bg-white flex flex-wrap items-center gap-1.5 ${
            isOpen ? 'border-[#1976d2] ring-1 ring-[#1976d2]/20' : 'border-[#cbd5e1]'
          } ${disabled ? 'bg-[#f1f5f9] cursor-not-allowed' : ''}`}
        >
          {props.values.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#7dd3fc]/50 text-[#0c4a6e] text-xs font-medium"
            >
              <span>{val}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => props.onChangeValues(props.values.filter((v) => v !== val))}
                  className="text-[#0369a1] hover:text-[#0c4a6e] cursor-pointer"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          <input
            type="text"
            disabled={disabled}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={props.values.length === 0 ? placeholder : 'Type to add more...'}
            className={`flex-1 min-w-[140px] h-7 px-1 text-xs bg-transparent focus:outline-none text-[#1e293b] ${inputClassName}`}
          />
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1976d2] shrink-0" />}
        </div>

        {isOpen && !disabled && (
          <SuggestionList
            grouped={grouped}
            flat={filtered}
            query={query}
            activeIndex={activeIndex}
            emptyMessage={emptyMessage}
            loading={loading}
            onHover={setActiveIndex}
            onSelect={handleSelect}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setIsOpen(true);
            if (allowManual) {
              props.onChange(next);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full h-7 px-2 text-xs border rounded-[2px] bg-white focus:outline-none focus:border-[#1976d2] ${
            disabled ? 'bg-[#f1f5f9] text-[#64748b] cursor-not-allowed' : ''
          } ${inputClassName}`}
        />
        {loading && <Loader2 className="w-3 h-3 animate-spin text-[#1976d2] absolute right-2" />}
      </div>

      {isOpen && !disabled && (
        <SuggestionList
          grouped={grouped}
          flat={filtered}
          query={query}
          activeIndex={activeIndex}
          emptyMessage={emptyMessage}
          loading={loading}
          onHover={setActiveIndex}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

function SuggestionList({
  grouped,
  flat,
  query,
  activeIndex,
  emptyMessage,
  loading,
  onHover,
  onSelect,
}: {
  grouped: [string, TypeAheadOption[]][];
  flat: TypeAheadOption[];
  query: string;
  activeIndex: number;
  emptyMessage: string;
  loading: boolean;
  onHover: (idx: number) => void;
  onSelect: (opt: TypeAheadOption) => void;
}) {
  return (
    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#cbd5e1] rounded-lg shadow-xl z-40 max-h-60 overflow-y-auto py-1">
      {loading ? (
        <div className="px-3 py-2 text-xs text-[#64748b] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1976d2]" />
          Loading suggestions...
        </div>
      ) : flat.length === 0 ? (
        <div className="px-3 py-2 text-xs text-[#64748b]">{emptyMessage}</div>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category || 'default'}>
            {category && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b] bg-[#f8fafc] border-y border-[#f1f5f9] first:border-t-0">
                {category}
              </div>
            )}
            {items.map((opt) => {
              const idx = flat.indexOf(opt);
              const isActive = idx === activeIndex;
              return (
                <button
                  key={`${category}-${opt.value}`}
                  type="button"
                  onMouseEnter={() => onHover(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(opt);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 cursor-pointer ${
                    isActive ? 'bg-[#e0f2fe] text-[#0c4a6e]' : 'text-[#1e293b] hover:bg-[#f8fafc]'
                  }`}
                >
                  <span className="truncate">
                    <HighlightedText text={opt.label} query={query} />
                  </span>
                  {opt.sublabel && (
                    <span className="text-[10.5px] text-[#64748b] shrink-0 truncate max-w-[160px]">
                      <HighlightedText text={opt.sublabel} query={query} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

