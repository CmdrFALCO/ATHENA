import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type { CreateSchemaInput, SchemaNodeType, SchemaConnectionType } from '../types';
import { schemaActions } from '../store/schemaActions';

interface SchemaEditorProps {
  onClose: () => void;
  existingSchema?: CreateSchemaInput & { id?: string };
}

export function SchemaEditor({ onClose, existingSchema }: SchemaEditorProps) {
  const [name, setName] = useState(existingSchema?.name || '');
  const [description, setDescription] = useState(existingSchema?.description || '');
  const [noteTypes, setNoteTypes] = useState<SchemaNodeType[]>(
    existingSchema?.noteTypes || [{ name: '' }]
  );
  const [connectionTypes, setConnectionTypes] = useState<SchemaConnectionType[]>(
    existingSchema?.connectionTypes || [{ label: '' }]
  );
  const [extractionHints, setExtractionHints] = useState<string[]>(
    existingSchema?.extractionHints || ['']
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const filteredNoteTypes = noteTypes.filter(t => t.name.trim());
    const filteredConnectionTypes = connectionTypes.filter(t => t.label.trim());
    const filteredHints = extractionHints.filter(h => h.trim());

    if (filteredNoteTypes.length === 0) {
      setError('At least one note type is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const input: CreateSchemaInput = {
        name: name.trim(),
        description: description.trim(),
        noteTypes: filteredNoteTypes,
        connectionTypes: filteredConnectionTypes,
        extractionHints: filteredHints,
      };

      if (existingSchema?.id) {
        await schemaActions.updateSchema(existingSchema.id, input);
      } else {
        await schemaActions.createSchema(input);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schema');
    } finally {
      setSaving(false);
    }
  };

  const addNoteType = () => setNoteTypes([...noteTypes, { name: '' }]);
  const removeNoteType = (index: number) => setNoteTypes(noteTypes.filter((_, i) => i !== index));
  const updateNoteType = (index: number, value: string) => {
    const updated = [...noteTypes];
    updated[index] = { ...updated[index], name: value };
    setNoteTypes(updated);
  };

  const addConnectionType = () => setConnectionTypes([...connectionTypes, { label: '' }]);
  const removeConnectionType = (index: number) => setConnectionTypes(connectionTypes.filter((_, i) => i !== index));
  const updateConnectionType = (index: number, value: string) => {
    const updated = [...connectionTypes];
    updated[index] = { ...updated[index], label: value };
    setConnectionTypes(updated);
  };

  const addHint = () => setExtractionHints([...extractionHints, '']);
  const removeHint = (index: number) => setExtractionHints(extractionHints.filter((_, i) => i !== index));
  const updateHint = (index: number, value: string) => {
    const updated = [...extractionHints];
    updated[index] = value;
    setExtractionHints(updated);
  };

  const modal = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-label="Schema Editor">
      <div className="bg-athena-surface border border-athena-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-athena-border">
          <h2 className="text-lg font-semibold text-athena-text">
            {existingSchema?.id ? 'Edit Schema' : 'Create Custom Schema'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-athena-bg rounded text-athena-muted" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Name & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-athena-text mb-1">Schema Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-athena-text placeholder-athena-muted"
                placeholder="e.g., Project Planning"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-athena-text mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-athena-text placeholder-athena-muted"
                rows={2}
                placeholder="Brief description of when to use this schema"
              />
            </div>
          </div>

          {/* Note Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-athena-text">Note Types *</label>
              <button
                onClick={addNoteType}
                className="text-sm text-blue-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {noteTypes.map((type, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={type.name}
                    onChange={(e) => updateNoteType(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm text-athena-text placeholder-athena-muted"
                    placeholder="e.g., Task, Milestone, Risk"
                  />
                  {noteTypes.length > 1 && (
                    <button
                      onClick={() => removeNoteType(index)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Connection Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-athena-text">Connection Types</label>
              <button
                onClick={addConnectionType}
                className="text-sm text-blue-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {connectionTypes.map((type, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={type.label}
                    onChange={(e) => updateConnectionType(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm text-athena-text placeholder-athena-muted"
                    placeholder="e.g., DEPENDS_ON, OWNED_BY"
                  />
                  {connectionTypes.length > 1 && (
                    <button
                      onClick={() => removeConnectionType(index)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Extraction Hints */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-athena-text">Extraction Hints</label>
              <button
                onClick={addHint}
                className="text-sm text-blue-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {extractionHints.map((hint, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm text-athena-text placeholder-athena-muted"
                    placeholder="e.g., Focus on dependencies between tasks"
                  />
                  {extractionHints.length > 1 && (
                    <button
                      onClick={() => removeHint(index)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-athena-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-athena-border rounded-lg hover:bg-athena-bg text-athena-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Schema'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
