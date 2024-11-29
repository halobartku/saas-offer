import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplate } from "../../db/schema";

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  onSave: () => void;
  onClose: () => void;
}

interface TemplateVariableError {
  name: string;
  message: string;
}

export function EmailTemplateEditor({ template, onSave, onClose }: EmailTemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [description, setDescription] = useState(template?.description || "");
  const [variables, setVariables] = useState<string[]>(template?.variables || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<{ subject: string; body: string } | null>(null);
  const [variableErrors, setVariableErrors] = useState<TemplateVariableError[]>([]);
  
  const { toast } = useToast();

  const validateVariables = (vars: string[]): boolean => {
    const errors: TemplateVariableError[] = [];
    const variableRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;

    vars.forEach(variable => {
      if (!variableRegex.test(variable)) {
        errors.push({
          name: variable,
          message: "Variable names must start with a letter and contain only letters, numbers, and underscores"
        });
      }
    });

    setVariableErrors(errors);
    return errors.length === 0;
  };

  const handlePreview = async () => {
    try {
      // Create sample data for preview
      const previewVars: Record<string, string> = {};
      variables.forEach(variable => {
        previewVars[variable] = `[Sample ${variable}]`;
      });

      const response = await fetch(`/api/email-templates/${name}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variables: previewVars }),
      });

      if (!response.ok) {
        throw new Error("Failed to preview template");
      }

      const preview = await response.json();
      setPreviewData(preview);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to preview template",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateVariables(variables)) {
      toast({
        title: "Validation Error",
        description: "Please fix the variable name errors before saving",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const endpoint = template 
        ? `/api/email-templates/${template.name}`
        : "/api/email-templates";
      
      const method = template ? "PUT" : "POST";
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          subject,
          body,
          description,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      toast({
        title: "Success",
        description: `Template ${template ? "updated" : "created"} successfully`,
      });

      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Welcome Email"
          required
          disabled={!!template}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email body content with variables like {{name}}"
          required
          className="min-h-[200px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Template description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="variables">Variables (comma-separated)</Label>
        <Input
          id="variables"
          value={variables.join(", ")}
          onChange={(e) => setVariables(e.target.value.split(",").map(v => v.trim()))}
          placeholder="name, company, date"
        />
      </div>

      {variableErrors.length > 0 && (
        <div className="space-y-2 text-red-500">
          <p className="font-semibold">Variable Errors:</p>
          <ul className="list-disc list-inside">
            {variableErrors.map((error, index) => (
              <li key={index}>{error.name}: {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {previewData && (
        <div className="space-y-2 border p-4 rounded-md bg-muted">
          <h3 className="font-semibold">Preview:</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Subject:</span> {previewData.subject}</p>
            <p><span className="font-medium">Body:</span></p>
            <p className="whitespace-pre-wrap">{previewData.body}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={handlePreview}>
          Preview
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (template ? "Update" : "Create")}
        </Button>
      </div>
    </form>
  );
}
