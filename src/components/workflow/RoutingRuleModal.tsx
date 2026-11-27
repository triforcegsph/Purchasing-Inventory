import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { ProcessRouteRule } from '../../types/erp';
import { LiveTypeAhead, type TypeAheadOption } from './LiveTypeAhead';
import { WorkflowConditionBuilder } from './WorkflowConditionBuilder';

interface RoutingRuleModalProps {
  gatewayTitle: string;
  initialRoute: ProcessRouteRule | null;
  defaultDestination: string;
  conditionOptions: TypeAheadOption[];
  destinationOptions: TypeAheadOption[];
  recipientOptions: TypeAheadOption[];
  defaultRecipientOptions: TypeAheadOption[];
  onSave: (rule: ProcessRouteRule) => void;
  onDelete?: (routeId: string) => void;
  onClose: () => void;
}

/**
 * Yooz-inspired Route Gateway Editor modal with live type-ahead for
 * Conditions, Destinations, Recipients (Users/Groups/Roles/Depts), and Default Recipient.
 */
export function RoutingRuleModal({
  gatewayTitle,
  initialRoute,
  defaultDestination,
  conditionOptions,
  destinationOptions,
  recipientOptions,
  defaultRecipientOptions,
  onSave,
  onDelete,
  onClose,
}: RoutingRuleModalProps) {
  const [name, setName] = useState(initialRoute?.name || '');
  const [isDefault, setIsDefault] = useState(initialRoute?.isDefault || false);
  const [conditions, setConditions] = useState(initialRoute?.conditions || '');
  const [destination, setDestination] = useState(initialRoute?.destination || defaultDestination);
  const [ignoreManual, setIgnoreManual] = useState(initialRoute?.ignoreManualRecipient || false);
  const [recipients, setRecipients] = useState<string[]>(initialRoute?.recipients || []);
  const [defaultRecipient, setDefaultRecipient] = useState(initialRoute?.defaultRecipient || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Route Name is required.');
      return;
    }
    if (!destination.trim()) {
      setError('Destination is required.');
      return;
    }
    onSave({
      id: initialRoute?.id || `rt-${Date.now()}`,
      name: name.trim(),
      isDefault,
      conditions: conditions.trim(),
      destination: destination.trim(),
      ignoreManualRecipient: ignoreManual,
      recipients,
      defaultRecipient: defaultRecipient.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-[#cbd5e1] w-full max-w-xl p-5 space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1e3a8a]">{gatewayTitle}</h3>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[#475569] cursor-pointer">
              <span>Default</span>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 accent-[#1976d2]"
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="text-[#64748b] hover:text-[#1e293b] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[#fce8e6] border border-[#f5c2c0] text-[#c5221f] px-3 py-1.5 rounded-md text-xs font-medium">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">
            Name <span className="text-[#d5002b]">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amount > 100,000 → Executive"
            className="w-full h-9 px-3 text-xs border border-[#cbd5e1] rounded-md focus:outline-none focus:border-[#1976d2]"
          />
        </div>

        {/* Conditions */}
        <div>
          <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">Conditions</label>
          <WorkflowConditionBuilder
            conditions={conditions}
            onChange={setConditions}
            conditionOptions={conditionOptions}
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">
            Destination <span className="text-[#d5002b]">*</span>
          </label>
          <LiveTypeAhead
            options={destinationOptions}
            value={destination}
            onChange={setDestination}
            placeholder="Type destination step or role..."
            inputClassName="h-9 px-3 rounded-md border-[#cbd5e1]"
          />
        </div>

        {/* Ignore manual recipient selection */}
        <label className="inline-flex items-center gap-2 text-xs text-[#475569] cursor-pointer">
          <span>Ignore manual recipient selection</span>
          <input
            type="checkbox"
            checked={ignoreManual}
            onChange={(e) => setIgnoreManual(e.target.checked)}
            className="w-4 h-4 accent-[#1976d2]"
          />
        </label>

        {/* Recipients */}
        <div>
          <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">Recipients</label>
          <LiveTypeAhead
            mode="chips"
            options={recipientOptions}
            values={recipients}
            onChangeValues={setRecipients}
            placeholder="Type user, group, role, or department..."
          />
        </div>

        {/* Default recipient */}
        <div>
          <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">Default recipient</label>
          <LiveTypeAhead
            options={defaultRecipientOptions}
            value={defaultRecipient}
            onChange={setDefaultRecipient}
            placeholder="Type default recipient name..."
            inputClassName="h-9 px-3 rounded-md border-[#cbd5e1]"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
          {initialRoute && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#c5221f] font-semibold">Confirm delete?</span>
                <button
                  type="button"
                  onClick={() => onDelete(initialRoute.id)}
                  className="px-2.5 py-1 bg-[#c5221f] text-white rounded-md font-semibold cursor-pointer"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 border border-[#cbd5e1] rounded-md cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#c5221f] hover:bg-[#fce8e6] rounded-md cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Route
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-[#1976d2] border border-[#cbd5e1] hover:bg-[#f8fafc] rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 text-xs font-semibold bg-[#1976d2] hover:bg-[#1565c0] text-white rounded-md cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

