import { useEffect, useRef, useState } from 'react';
import { useSelector } from '@legendapp/state/react';
import { FileText, ChevronDown, Check, Plus } from 'lucide-react';
import { schemaState$ } from '../store/schemaState';
import { schemaActions } from '../store/schemaActions';
import { devSettings$ } from '@/config/devSettings';

interface SchemaSelectorProps {
  onCreateNew?: () => void;
}

export function SchemaSelector({ onCreateNew }: SchemaSelectorProps) {
  const schemas = useSelector(() => schemaState$.schemas.get());
  const loading = useSelector(() => schemaState$.loading.get());
  const activeSchemaId = useSelector(() => devSettings$.schema.activeSchemaId.get());
  const enabled = useSelector(() => devSettings$.schema.enabled.get());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (schemas.length === 0 && !loading) {
      schemaActions.loadSchemas();
    }
  }, [schemas.length, loading]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!enabled) return null;

  const activeSchema = schemas.find(s => s.id === activeSchemaId);
  const builtIn = schemas.filter(s => s.isBuiltIn);
  const custom = schemas.filter(s => !s.isBuiltIn);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-athena-border rounded-lg hover:bg-athena-surface transition-colors text-athena-text"
        title="Select knowledge schema"
      >
        <FileText className="w-3.5 h-3.5" />
        <span className="max-w-32 truncate">
          {activeSchema?.name || 'No Schema'}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-athena-surface border border-athena-border rounded-lg shadow-lg z-50">
          <div className="p-2">
            {/* No schema option */}
            <button
              onClick={() => {
                schemaActions.setActiveSchema(null);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-athena-bg ${
                !activeSchemaId ? 'bg-athena-bg text-blue-400' : 'text-athena-text'
              }`}
            >
              {!activeSchemaId && <Check className="w-3.5 h-3.5" />}
              <span className={!activeSchemaId ? '' : 'ml-5'}>No Schema (free-form)</span>
            </button>

            {/* Built-in schemas */}
            {builtIn.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs text-athena-muted uppercase mt-2">
                  Built-in
                </div>
                {builtIn.map(schema => (
                  <button
                    key={schema.id}
                    onClick={() => {
                      schemaActions.setActiveSchema(schema.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-athena-bg ${
                      activeSchemaId === schema.id ? 'bg-athena-bg text-blue-400' : 'text-athena-text'
                    }`}
                  >
                    {activeSchemaId === schema.id && <Check className="w-3.5 h-3.5" />}
                    <span className={activeSchemaId === schema.id ? '' : 'ml-5'}>
                      {schema.name}
                    </span>
                    <span className="ml-auto text-xs text-athena-muted">
                      {schema.usageCount} uses
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Custom schemas */}
            {custom.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs text-athena-muted uppercase mt-2">
                  Custom
                </div>
                {custom.map(schema => (
                  <button
                    key={schema.id}
                    onClick={() => {
                      schemaActions.setActiveSchema(schema.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-athena-bg ${
                      activeSchemaId === schema.id ? 'bg-athena-bg text-blue-400' : 'text-athena-text'
                    }`}
                  >
                    {activeSchemaId === schema.id && <Check className="w-3.5 h-3.5" />}
                    <span className={activeSchemaId === schema.id ? '' : 'ml-5'}>
                      {schema.name}
                    </span>
                    <span className="ml-auto text-xs text-athena-muted">
                      {schema.usageCount} uses
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Create new */}
            {onCreateNew && (
              <>
                <div className="border-t border-athena-border my-2" />
                <button
                  onClick={() => {
                    onCreateNew();
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 rounded hover:bg-athena-bg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Custom Schema
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
