import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  id: string;
  status: string;
  children: React.ReactNode;
}

export function DroppableColumn({ id, status, children }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-muted p-4 rounded-lg space-y-4"
    >
      {children}
    </div>
  );
}
