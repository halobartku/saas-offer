import { useDroppable } from '@dnd-kit/core';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DroppableColumnProps {
  id: string;
  title: string;
  items: any[];
}

export function DroppableColumn({ id, title, items }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isMobile = useMobile();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 bg-muted rounded-lg transition-colors",
        isMobile ? "w-[90vw] snap-center" : "w-[350px]",
        isOver ? "ring-2 ring-primary bg-muted/80" : ""
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">{title}</h3>
          <span className="text-sm text-muted-foreground">{items.length}</span>
        </div>
        <div className={cn(
          "space-y-4",
          isMobile ? "min-h-[70vh]" : "min-h-[200px]"
        )}>
          {items}
        </div>
      </div>
    </div>
  );
}
