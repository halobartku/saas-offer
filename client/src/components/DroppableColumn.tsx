import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  id: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "closed";
  children: React.ReactNode;
}

export function DroppableColumn({ id, status, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted p-4 rounded-lg space-y-4 ${
        isOver ? 'ring-2 ring-primary' : ''
      }`}
    >
      {children}
    </div>
  );
}
