/**
 * ViolationFilters - Filter controls for the violation list
 * WP 5.6: Validation Panel UI
 */

import { Filter } from 'lucide-react';

interface ViolationFiltersProps {
  severityFilter: 'all' | 'error' | 'warning';
  onSeverityChange: (value: 'all' | 'error' | 'warning') => void;
  ruleFilter: string; // 'all' or specific rule ID
  onRuleChange: (value: string) => void;
  availableRules: Array<{ id: string; name: string }>;
}

export function ViolationFilters({
  severityFilter,
  onSeverityChange,
  ruleFilter,
  onRuleChange,
  availableRules,
}: ViolationFiltersProps) {
  return (
    <div className="px-4 py-2 border-b border-athena-border flex items-center gap-2">
      <Filter className="w-4 h-4 text-athena-muted flex-shrink-0" />

      {/* Severity filter */}
      <select
        value={severityFilter}
        onChange={(e) =>
          onSeverityChange(e.target.value as 'all' | 'error' | 'warning')
        }
        className="bg-athena-surface border border-athena-border rounded px-2 py-1
                   text-sm text-athena-text focus:outline-none focus:border-blue-500"
      >
        <option value="all">All severities</option>
        <option value="error">Errors only</option>
        <option value="warning">Warnings only</option>
      </select>

      {/* Rule filter */}
      <select
        value={ruleFilter}
        onChange={(e) => onRuleChange(e.target.value)}
        className="bg-athena-surface border border-athena-border rounded px-2 py-1
                   text-sm text-athena-text focus:outline-none focus:border-blue-500"
      >
        <option value="all">All rules</option>
        {availableRules.map((rule) => (
          <option key={rule.id} value={rule.id}>
            {rule.name}
          </option>
        ))}
      </select>
    </div>
  );
}
