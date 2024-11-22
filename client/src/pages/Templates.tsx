import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Copy } from "lucide-react";
import TemplateForm from "@/components/TemplateForm";
import { useToast } from "@/hooks/use-toast";
import useSWR, { mutate } from "swr";
import type { OfferTemplate } from "db/schema";
import { format } from "date-fns";

export default function Templates() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OfferTemplate | null>(null);
  const { data: templates } = useSWR<OfferTemplate[]>("/api/templates");
  const { toast } = useToast();
  
  const filteredTemplates = templates?.filter(template => 
    template.name.toLowerCase().includes(search.toLowerCase()) ||
    template.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (template: OfferTemplate) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete template");
      }

      toast({
        title: "Success",
        description: "Template has been deleted successfully",
      });

      mutate("/api/templates");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setSelectedTemplate(null);
    }
  };

  const handleUseTemplate = async (template: OfferTemplate) => {
    try {
      // Store the template in localStorage for use in offer creation
      localStorage.setItem('selectedTemplate', JSON.stringify(template));
      
      // Navigate to create offer page
      window.location.href = '/offers?template=true';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to use template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Templates</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <TemplateForm 
              onSuccess={() => {
                mutate("/api/templates");
                setIsCreateOpen(false);
              }}
              onClose={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTemplates?.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">{template.name}</TableCell>
              <TableCell>{template.description}</TableCell>
              <TableCell>{format(new Date(template.createdAt), 'PP')}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Use
                </Button>

                <Dialog 
                  open={isEditOpen && selectedTemplate?.id === template.id}
                  onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (!open) setSelectedTemplate(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <TemplateForm 
                      initialData={template}
                      onSuccess={() => {
                        mutate("/api/templates");
                        setIsEditOpen(false);
                        setSelectedTemplate(null);
                      }}
                      onClose={() => {
                        setIsEditOpen(false);
                        setSelectedTemplate(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template
              {selectedTemplate && ` "${selectedTemplate.name}"`} and remove its data
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTemplate(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && handleDelete(selectedTemplate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
