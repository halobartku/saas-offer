import { useState, useEffect } from "react";
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
import type { Email, EmailTemplate } from "db/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmailComposerProps {
  onClose: () => void;
  onSuccess?: (email: Email) => void;
  replyTo?: Email;
}

export function EmailComposer({ onClose, onSuccess, replyTo }: EmailComposerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    toEmail: replyTo?.fromEmail || "",
    subject: replyTo ? `Re: ${replyTo.subject}` : "",
    body: "",
  });

  useEffect(() => {
    // Fetch available email templates
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/email-templates");
        if (!response.ok) throw new Error("Failed to fetch templates");
        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast({
          title: "Error",
          description: "Failed to load email templates",
          variant: "destructive",
        });
      }
    };
    fetchTemplates();
  }, []);

  const handleTemplateChange = async (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = templates.find(t => t.name === templateName);
    if (template) {
      // Reset template variables
      const newVariables: Record<string, string> = {};
      template.variables?.forEach(variable => {
        newVariables[variable] = "";
      });
      setTemplateVariables(newVariables);
    }
  };

  const handleTemplatePreview = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await fetch(`/api/email-templates/${selectedTemplate}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variables: templateVariables }),
      });

      if (!response.ok) throw new Error("Failed to preview template");
      
      const { subject, body } = await response.json();
      setFormData(prev => ({
        ...prev,
        subject,
        body,
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview template",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Failed to send email");
      }

      const email = await response.json();
      toast({
        title: "Success",
        description: "Email sent successfully",
      });

      onSuccess?.(email);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
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
          <Label htmlFor="template">Template</Label>
          <div className="flex gap-2">
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <Button type="button" variant="outline" onClick={handleTemplatePreview}>
                Preview
              </Button>
            )}
          </div>
        </div>

        {selectedTemplate && Object.keys(templateVariables).length > 0 && (
          <div className="space-y-2">
            <Label>Template Variables</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(templateVariables).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`var-${key}`}>{key}</Label>
                  <Input
                    id={`var-${key}`}
                    value={value}
                    onChange={(e) =>
                      setTemplateVariables((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
          Send Email
        </Button>
      </DialogFooter>
    </form>
  );
}
