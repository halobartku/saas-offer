import { useState } from "react";
import { useDroppable } from '@dnd-kit/core';
import { Input } from "@/components/ui/input";

interface DroppableColumnProps {
  id: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "closed" | "archived";
  customName: string;
  onNameChange?: (newName: string) => void;
  children: React.ReactNode;
}

export function DroppableColumn({ id, status, customName, onNameChange, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(customName);
  
  const handleSubmit = () => {
    if (onNameChange) {
      onNameChange(editValue);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted p-4 rounded-lg space-y-4 min-h-[200px] transition-colors ${
        isOver ? 'ring-2 ring-primary bg-muted/80' : ''
      }`}
    >
      <div className="flex justify-between items-center">
        {isEditing ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex-1"
          >
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSubmit}
              autoFocus
              className="h-7 text-sm font-semibold"
            />
          </form>
        ) : (
          <h3 
            className="font-semibold capitalize cursor-pointer hover:text-primary"
            onClick={() => setIsEditing(true)}
          >
            {customName}
          </h3>
        )}
        <span className="text-sm text-muted-foreground ml-2">
          {children}
        </span>
      </div>
    </div>
  );
}
