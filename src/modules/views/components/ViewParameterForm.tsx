// src/modules/views/components/ViewParameterForm.tsx — WP 8.9: Smart Views

import React, { useState, useEffect } from 'react';
import type { SmartView, ViewParameter } from '../types';

interface ViewParameterFormProps {
  view: SmartView;
  onSubmit: (values: Record<string, string | number>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ViewParameterForm({ view, onSubmit, onCancel, isLoading }: ViewParameterFormProps) {
  const [values, setValues] = useState<Record<string, string | number>>({});

  // Initialize with defaults
  useEffect(() => {
    const defaults: Record<string, string | number> = {};
    for (const param of view.parameters) {
      if (param.defaultValue !== undefined) {
        defaults[param.name] = param.defaultValue;
      }
    }
    setValues(defaults);
  }, [view]);

  const handleChange = (param: ViewParameter, value: string) => {
    setValues((prev) => ({
      ...prev,
      [param.name]: param.type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const isValid = view.parameters
    .filter((p) => p.required)
    .every((p) => values[p.name] !== undefined && values[p.name] !== '');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {view.parameters.map((param) => (
        <div key={param.name}>
          <label className="block text-sm font-medium text-athena-text mb-1">
            {param.label}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>

          {param.type === 'select' ? (
            <select
              value={values[param.name] ?? ''}
              onChange={(e) => handleChange(param, e.target.value)}
              className="w-full px-3 py-2 bg-athena-bg border border-athena-border
                       rounded-md text-athena-text focus:outline-none focus:ring-2
                       focus:ring-blue-500/50"
              required={param.required}
            >
              <option value="">Select...</option>
              {param.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'}
              value={values[param.name] ?? ''}
              onChange={(e) => handleChange(param, e.target.value)}
              placeholder={param.defaultValue?.toString()}
              className="w-full px-3 py-2 bg-athena-bg border border-athena-border
                       rounded-md text-athena-text focus:outline-none focus:ring-2
                       focus:ring-blue-500/50"
              required={param.required}
            />
          )}
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-athena-muted hover:text-athena-text
                   hover:bg-athena-bg rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md
                   hover:bg-blue-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running...' : 'Run View'}
        </button>
      </div>
    </form>
  );
}
