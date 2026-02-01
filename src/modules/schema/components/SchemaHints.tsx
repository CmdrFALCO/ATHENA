import { useSelector } from '@legendapp/state/react';
import { Lightbulb } from 'lucide-react';
import { schemaActions } from '../store/schemaActions';
import { devSettings$ } from '@/config/devSettings';

/**
 * Displays hints from the active schema in the chat input area.
 * WP 8.5 - Knowledge Schema Templates
 */
export function SchemaHints() {
  const showHints = useSelector(() => devSettings$.schema.showHintsInChat.get());
  const enabled = useSelector(() => devSettings$.schema.enabled.get());
  const activeSchemaId = useSelector(() => devSettings$.schema.activeSchemaId.get());

  if (!enabled || !showHints || !activeSchemaId) return null;

  const activeSchema = schemaActions.getActiveSchema();
  if (!activeSchema) return null;

  return (
    <div className="px-3 py-2 bg-amber-900/20 border-b border-amber-700/30 text-sm">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" />
        <div>
          <span className="font-medium text-amber-300">
            {activeSchema.name}:
          </span>{' '}
          <span className="text-amber-200/80">
            {activeSchema.extractionHints[0] || activeSchema.description}
          </span>
        </div>
      </div>
    </div>
  );
}
