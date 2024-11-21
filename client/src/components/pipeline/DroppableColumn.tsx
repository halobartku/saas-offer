import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableColumnProps {
  id: string;
  status: string; // Changed from union type to string to match OFFER_STATUS type
  children: React.ReactNode;
  className?: string;
}

export function DroppableColumn({
  id,
  status,
  children,
  className,
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-4 rounded-lg bg-muted/50 min-h-[200px]",
        isOver && "ring-2 ring-primary/20",
        className,
      )}
    >
      {children}
    </div>
  );
}
