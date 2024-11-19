import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  id: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "closed" | "paid";
  children: React.ReactNode;
}

export function DroppableColumn({ id, status, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted p-4 rounded-lg space-y-4 min-h-[200px] transition-colors ${
        isOver ? 'ring-2 ring-primary bg-muted/80' : ''
      }`}
    >
      {children}
    </div>
  );
}
