import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DroppableColumnProps {
  id: string;
  status: string;
  children: React.ReactNode;
}

export function DroppableColumn({ id, status, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted p-4 rounded-lg space-y-4 transition-colors ${
        isOver ? 'bg-primary/10' : ''
      }`}
    >
      {children}
    </div>
  );
}
