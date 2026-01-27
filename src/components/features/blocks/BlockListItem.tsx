import { Clock, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '../../ui';
import type { BlockGroup } from '../../../pages/admin/CourtBlocking';

interface BlockListItemProps {
  group: BlockGroup;
  onEdit: (group: BlockGroup) => void;
  onDelete: (group: BlockGroup) => void;
  canEdit: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Heute';
  if (date.toDateString() === tomorrow.toDateString()) return 'Morgen';

  return date.toLocaleDateString('de-AT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BlockListItem({ group, onEdit, onDelete, canEdit }: BlockListItemProps) {
  return (
    <div className="p-3 hover:bg-muted/50 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Color indicator */}
        <div className="w-1 self-stretch rounded-full bg-primary flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm">
                {formatDate(group.date)}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {group.startTime} - {group.endTime}
              </span>
            </div>

            {/* Action buttons */}
            {canEdit && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(group)}
                  className="p-1.5 text-info hover:bg-info/10 rounded transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(group)}
                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Courts */}
            <div className="flex gap-1">
              {group.courtNumbers.map((court) => (
                <span
                  key={court}
                  className="px-2 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground"
                >
                  {court}
                </span>
              ))}
            </div>

            {/* Reason */}
            <Badge variant="secondary" className="text-xs">
              {group.reasonName}
            </Badge>

            {/* Details */}
            {group.details && (
              <span className="text-xs text-muted-foreground">
                • {group.details}
              </span>
            )}

            {/* Temporary badge */}
            {group.isTemporary && (
              <Badge variant="warning" className="text-xs">
                Temp
              </Badge>
            )}
          </div>

          {/* Creator */}
          {group.createdByName && (
            <div className="text-xs text-muted-foreground mt-1">
              von {group.createdByName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlockListItem;
