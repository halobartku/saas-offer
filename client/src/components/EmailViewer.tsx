import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import type { Email } from "db/schema";
import { ArrowLeftRight, Reply, Trash2 } from "lucide-react";

interface EmailViewerProps {
  email: Email;
  onReply: (email: Email) => void;
  onClose: () => void;
  onDelete: (email: Email) => void;
}

export function EmailViewer({ email, onReply, onClose, onDelete }: EmailViewerProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(email);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{email.subject}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex justify-between items-start border-b pb-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">From: {email.fromEmail}</p>
            <p className="text-sm text-muted-foreground">
              To: {email.toEmail}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(email.createdAt), "PPpp")}
            </p>
            {email.parentId && (
              <p className="text-xs text-muted-foreground">
                In reply to previous message
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(email)}
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className={`prose prose-sm max-w-none ${email.parentId ? 'ml-4 pl-4 border-l-2 border-gray-200' : ''}`}>
          <p className="whitespace-pre-wrap">{email.body}</p>
        </div>

        {/* Display quoted text from parent email if this is a reply */}
        {email.parentId && (
          <div className="mt-4 ml-6 pl-4 border-l-2 border-gray-200 text-sm text-gray-500">
            <p className="italic">Original message</p>
            <p className="whitespace-pre-wrap">{email.body}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}
