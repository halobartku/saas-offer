import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Email } from "db/schema";

interface EmailComposerProps {
  onClose: () => void;
  onSuccess?: (email: Email) => void;
  replyTo?: Email;
}

export function EmailComposer({ onClose, onSuccess, replyTo }: EmailComposerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    toEmail: replyTo?.fromEmail || "",
    subject: replyTo ? `Re: ${replyTo.subject}` : "",
    body: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          status: "sent",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to send email");
      }

      toast({
        title: "Success",
        description: "Email sent successfully",
      });

      onSuccess?.(data);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send email";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Compose Email</DialogTitle>
        <DialogDescription>
          Create and send a new email message
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            placeholder="recipient@example.com"
            value={formData.toEmail}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, toEmail: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Enter subject"
            value={formData.subject}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subject: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            placeholder="Type your message here"
            value={formData.body}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, body: e.target.value }))
            }
            className="min-h-[200px]"
            required
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive mt-2">
          {error}
        </div>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="mr-2">Sending...</span>
              <span className="animate-spin">⚪</span>
            </>
          ) : (
            "Send Email"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
