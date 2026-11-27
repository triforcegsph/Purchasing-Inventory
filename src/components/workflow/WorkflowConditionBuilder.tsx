import { useState } from 'react';
import { X } from 'lucide-react';
import { LiveTypeAhead, type TypeAheadOption } from './LiveTypeAhead';

interface WorkflowConditionBuilderProps {
  conditions: string;
  onChange: (next: string) => void;
  conditionOptions: TypeAheadOption[];
}

/**
 * Reusable condition chip builder with LiveTypeAhead field suggestions
 * and an inline Values / Between...and... / Empty / Filled operator builder.
 */
export function WorkflowConditionBuilder({
  conditions,
  onChange,
  conditionOptions,
}: WorkflowConditionBuilderProps) {
  const [fieldInput, setFieldInput] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [condMode, setCondMode] = useState<'values' | 'between'>('values');
  const [condOperator, setCondOperator] = useState('Equal to');
  const [condValue1, setCondValue1] = useState('');
  const [condValue2, setCondValue2] = useState('');

  const chips = conditions
    .split(' AND ')
    .map((c) => c.trim())
    .filter(Boolean);

  const applyCondition = (overrideExpr?: string) => {
    if (!activeField) return;
    let expr = overrideExpr;
    if (!expr) {
      if (condMode === 'between') {
        expr = `${activeField} : Between ${condValue1 || '0'} and ${condValue2 || '0'}`;
      } else {
        expr = `${activeField} : ${condOperator} ${condValue1 || '0'}`;
      }
    }
    onChange(chips.length > 0 ? `${chips.join(' AND ')} AND ${expr}` : expr);
    setActiveField(null);
    setFieldInput('');
    setCondValue1('');
    setCondValue2('');
  };

  return (
    <div className="space-y-2">
      <div className="min-h-[58px] p-2 border border-[#cbd5e1] focus-within:border-[#1976d2] rounded-md bg-white flex flex-wrap items-start gap-1.5 relative pr-7">
        {chips.map((chip, idx) => (
          <span
            key={`${chip}-${idx}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#7dd3fc]/55 text-[#0c4a6e] text-xs font-medium"
          >
            <span>{chip}</span>
            <button
              type="button"
              onClick={() => onChange(chips.filter((_, i) => i !== idx).join(' AND '))}
              className="text-[#0369a1] hover:text-[#0c4a6e] cursor-pointer"
              title="Remove condition"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex-1 min-w-[190px]">
          <LiveTypeAhead
            options={conditionOptions}
            value={fieldInput}
            onChange={setFieldInput}
            onSelectOption={(opt) => {
              setActiveField(opt.label);
              setFieldInput('');
            }}
            placeholder={
              chips.length === 0
                ? 'If empty, no condition (always true) — type to see suggestions'
                : 'Type to add another condition...'
            }
            inputClassName="border-0 h-7 px-1 focus:ring-0"
          />
        </div>
        {chips.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setFieldInput('');
            }}
            className="absolute right-2 top-2 text-[#64748b] hover:text-[#1e293b] cursor-pointer"
            title="Clear all conditions"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeField && (
        <div className="bg-white border border-[#93c5fd] rounded-lg shadow-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 bg-[#bae6fd] text-[#0369a1] rounded text-xs font-semibold truncate">
              {activeField}:
            </span>
            <div className="flex gap-3 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setCondMode('values')}
                className={`pb-0.5 border-b-2 cursor-pointer ${
                  condMode === 'values' ? 'border-[#1976d2] text-[#1976d2]' : 'border-transparent text-[#64748b]'
                }`}
              >
                Values
              </button>
              <button
                type="button"
                onClick={() => setCondMode('between')}
                className={`pb-0.5 border-b-2 cursor-pointer ${
                  condMode === 'between' ? 'border-[#1976d2] text-[#1976d2]' : 'border-transparent text-[#64748b]'
                }`}
              >
                Between...and...
              </button>
            </div>
          </div>

          {condMode === 'values' ? (
            <div className="flex gap-2">
              <select
                value={condOperator}
                onChange={(e) => setCondOperator(e.target.value)}
                className="h-8 px-2 text-xs border border-[#cbd5e1] rounded-md bg-white"
              >
                <option>Equal to</option>
                <option>Greater than</option>
                <option>Less than</option>
                <option>Contains</option>
              </select>
              <input
                value={condValue1}
                onChange={(e) => setCondValue1(e.target.value)}
                placeholder="Value..."
                className="flex-1 h-8 px-2.5 text-xs border border-[#1976d2] rounded-md"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <input
                value={condValue1}
                onChange={(e) => setCondValue1(e.target.value)}
                placeholder="Min"
                className="flex-1 h-8 px-2.5 border border-[#cbd5e1] rounded-md"
              />
              <span className="text-[#64748b]">and</span>
              <input
                value={condValue2}
                onChange={(e) => setCondValue2(e.target.value)}
                placeholder="Max"
                className="flex-1 h-8 px-2.5 border border-[#cbd5e1] rounded-md"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2 text-xs font-semibold text-[#1976d2]">
              <button
                type="button"
                onClick={() => applyCondition(`${activeField} : Empty`)}
                className="hover:underline cursor-pointer"
              >
                Empty
              </button>
              <button
                type="button"
                onClick={() => applyCondition(`${activeField} : Filled`)}
                className="hover:underline cursor-pointer"
              >
                Filled
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveField(null)}
                className="px-3 py-1 text-xs font-semibold text-[#1976d2] border border-[#cbd5e1] rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyCondition()}
                className="px-3 py-1 text-xs font-semibold bg-[#1976d2] text-white rounded-md cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

