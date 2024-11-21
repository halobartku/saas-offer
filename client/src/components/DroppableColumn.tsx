import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function DroppableColumn({ id, title, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
      </div>
      <div
        ref={setNodeRef}
        className={`bg-muted/50 p-4 rounded-lg space-y-4 min-h-[200px] transition-colors ${
          isOver ? 'ring-2 ring-primary bg-muted/80' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}
