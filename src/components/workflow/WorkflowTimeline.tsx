import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  GitFork,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ProcessPhaseConfig, ProcessRouteRule } from '../../types/erp';
import { LiveTypeAhead, type TypeAheadOption } from './LiveTypeAhead';

export interface PhaseRuntimeInfo {
  status: 'done' | 'active' | 'pending';
  badgeCount?: number | null;
  actionTitle?: string;
  onActionClick?: () => void;
}

interface WorkflowTimelineProps {
  phases: ProcessPhaseConfig[];
  phaseNameOptions: TypeAheadOption[];
  getPhaseRuntime: (phase: ProcessPhaseConfig) => PhaseRuntimeInfo;
  onUpdatePhaseName: (phaseId: string, name: string) => void;
  onAddPhase: () => void;
  onDeletePhase: (phaseId: string) => void;
  onAddRoute: (phaseId: string) => void;
  onEditRoute: (phaseId: string, route: ProcessRouteRule) => void;
  onReorderRoute: (phaseId: string, routeId: string, dir: 'up' | 'down') => void;
}

/**
 * Reusable Yooz-inspired horizontal scrollable workflow timeline with
 * phase configuration, step indicators, clickable action pills, and routing panels.
 */
export function WorkflowTimeline({
  phases,
  phaseNameOptions,
  getPhaseRuntime,
  onUpdatePhaseName,
  onAddPhase,
  onDeletePhase,
  onAddRoute,
  onEditRoute,
  onReorderRoute,
}: WorkflowTimelineProps) {
  const [confirmDeletePhaseId, setConfirmDeletePhaseId] = useState<string | null>(null);

  if (phases.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#cbd5e1] rounded-lg p-8 text-center space-y-3">
        <div className="text-xs font-semibold text-[#475569]">
          No workflow phases configured for this process yet.
        </div>
        <button
          type="button"
          onClick={onAddPhase}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-semibold rounded-md cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add First Phase
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-flex min-w-full items-stretch divide-x divide-dashed divide-[#cbd5e1]">
        {phases.map((phase, idx) => {
          const runtime = getPhaseRuntime(phase);
          return (
            <div key={phase.id} className="w-[330px] shrink-0 px-4 py-2 flex flex-col">
              {/* Phase Header: Editable Name (with TypeAhead) + Steps + Remove */}
              <div className="flex items-end gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-[11px] font-medium text-[#64748b] mb-1">Phase:</label>
                  <LiveTypeAhead
                    options={phaseNameOptions}
                    value={phase.phaseName}
                    onChange={(val) => onUpdatePhaseName(phase.id, val)}
                    placeholder="Phase name..."
                    inputClassName="h-8 px-2.5 text-xs font-medium text-[#1e293b] bg-white border-[#cbd5e1] rounded-md"
                  />
                </div>
                <div className="w-14 shrink-0">
                  <label className="block text-[11px] font-medium text-[#64748b] mb-1">Steps:</label>
                  <div className="h-8 px-2 flex items-center justify-center text-xs font-semibold text-[#1e293b] bg-white border border-[#cbd5e1] rounded-md">
                    {phase.routes.length}
                  </div>
                </div>
                {phases.length > 1 && (
                  confirmDeletePhaseId === phase.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePhase(phase.id);
                        setConfirmDeletePhaseId(null);
                      }}
                      className="h-8 px-2 bg-[#c5221f] text-white text-[10.5px] font-semibold rounded-md cursor-pointer shrink-0"
                      title="Confirm remove phase"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePhaseId(phase.id)}
                      className="h-8 w-8 flex items-center justify-center text-[#64748b] hover:text-[#c5221f] bg-white border border-[#cbd5e1] rounded-md cursor-pointer shrink-0"
                      title="Remove phase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>

              {/* Horizontal Flow Line: >>> [Gateway] >>> [Clickable Action Pill] >>> (Status) */}
              <div className="relative flex items-center gap-2 py-2 mb-3">
                <div className="flex-1 border-t-2 border-dotted border-[#7dd3fc]" />
                <button
                  type="button"
                  onClick={() => onAddRoute(phase.id)}
                  title="Add routing rule"
                  className="w-9 h-9 rounded-lg bg-white border border-[#cbd5e1] shadow-xs flex items-center justify-center text-[#1e40af] hover:border-[#1976d2] cursor-pointer shrink-0"
                >
                  <GitFork className="w-4 h-4" />
                </button>
                <div className="w-3 border-t-2 border-dotted border-[#7dd3fc]" />
                <button
                  type="button"
                  onClick={runtime.onActionClick}
                  title={runtime.actionTitle || phase.actionLabel}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 text-xs font-semibold shadow-xs whitespace-nowrap cursor-pointer transition-colors ${
                    runtime.status === 'active'
                      ? 'bg-[#eff6ff] hover:bg-[#1976d2] border-[#1976d2] text-[#1976d2] hover:text-white'
                      : runtime.status === 'done'
                      ? 'bg-white hover:bg-[#1976d2] border-[#1976d2] text-[#1976d2] hover:text-white'
                      : 'bg-white hover:bg-[#1976d2] border-[#94a3b8] text-[#475569] hover:text-white hover:border-[#1976d2]'
                  }`}
                >
                  <span>{phase.actionLabel}</span>
                  {runtime.badgeCount !== null && runtime.badgeCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#dbeafe] text-[#1e3a8a] text-[10px] font-bold">
                      {runtime.badgeCount}
                    </span>
                  )}
                </button>
                <div className="flex-1 border-t-2 border-dotted border-[#7dd3fc]" />
                {idx < phases.length - 1 && (
                  <span
                    className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 ${
                      runtime.status === 'done'
                        ? 'bg-[#10b981]'
                        : runtime.status === 'active'
                        ? 'bg-[#1976d2]'
                        : 'bg-[#cbd5e1]'
                    }`}
                    title={`Step status: ${runtime.status}`}
                  >
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Routing Rules Panel */}
              <div className="bg-white border border-[#dce2ec] rounded-lg shadow-xs overflow-hidden flex-1 min-h-[210px] flex flex-col">
                <div className="px-3 py-2 bg-[#eff4fb] border-b border-[#dce2ec] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b] truncate">
                    {phase.routes.length} {phase.routes.length === 1 ? 'Route' : 'Routes'} ({phase.gatewayTitle})
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddRoute(phase.id)}
                    className="w-6 h-6 rounded hover:bg-[#dbeafe] text-[#1e293b] flex items-center justify-center cursor-pointer shrink-0"
                    title="Add new route"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-[#eef2f6] flex-1">
                  {phase.routes.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-[#64748b]">
                      No routes configured. Click + to add a route.
                    </div>
                  ) : (
                    phase.routes.map((rt, rIdx) => (
                      <div
                        key={rt.id}
                        className="px-2.5 py-2 hover:bg-[#f8fafc] flex items-center justify-between gap-1.5 text-xs transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => onEditRoute(phase.id, rt)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span className="text-[11px] font-mono text-[#64748b] w-4 shrink-0">
                            {rt.isDefault ? '✓' : rIdx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[#1e293b] truncate flex items-center gap-1.5">
                              <span className="truncate">{rt.name}</span>
                              {rt.isDefault && (
                                <span className="text-[9.5px] px-1 py-0.2 bg-[#e0f2fe] text-[#0369a1] rounded font-semibold shrink-0">
                                  Default
                                </span>
                              )}
                            </div>
                            {rt.conditions && (
                              <div className="text-[10.5px] text-[#0284c7] font-mono truncate">
                                {rt.conditions}
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10.5px] text-[#64748b] max-w-[90px] truncate">
                            {rt.defaultRecipient || rt.destination}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={rIdx === 0}
                              onClick={() => onReorderRoute(phase.id, rt.id, 'up')}
                              className="text-[#94a3b8] hover:text-[#1e293b] disabled:opacity-25 cursor-pointer"
                              title="Move rule up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={rIdx === phase.routes.length - 1}
                              onClick={() => onReorderRoute(phase.id, rt.id, 'down')}
                              className="text-[#94a3b8] hover:text-[#1e293b] disabled:opacity-25 cursor-pointer"
                              title="Move rule down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Phase Column */}
        <div className="w-44 shrink-0 px-4 py-2 flex items-center justify-center">
          <button
            type="button"
            onClick={onAddPhase}
            className="w-full h-36 border-2 border-dashed border-[#cbd5e1] hover:border-[#1976d2] hover:bg-[#eff6ff]/60 rounded-lg flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#475569] hover:text-[#1976d2] cursor-pointer transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Phase</span>
          </button>
        </div>
      </div>
    </div>
  );
}

