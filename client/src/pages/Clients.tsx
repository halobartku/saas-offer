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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Plus, Search, Mail, Phone, Building2, FileText, Trash2, Edit } from "lucide-react";
import ClientForm from "@/components/ClientForm";
import { useToast } from "@/hooks/use-toast";
import useSWR, { mutate } from "swr";
import type { Client } from "db/schema";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { data: clients } = useSWR<Client[]>("/api/clients");
  const { toast } = useToast();
  
  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleDelete = async (client: Client) => {
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete client");
      }

      toast({
        title: "Success",
        description: "Client has been deleted successfully",
      });

      mutate("/api/clients");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete client",
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setSelectedClient(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <ClientForm 
              onSuccess={() => mutate("/api/clients")}
              onClose={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Client Type</TableHead>
            <TableHead>VAT Number</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients?.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  {client.email}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  {client.phone}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  {capitalizeFirstLetter(client.clientType)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  {client.vatNumber || "-"}
                </div>
              </TableCell>
              <TableCell>{client.address}</TableCell>
              <TableCell className="text-right space-x-2">
                <Dialog open={isEditOpen && selectedClient?.id === client.id} onOpenChange={(open) => {
                  setIsEditOpen(open);
                  if (!open) setSelectedClient(null);
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedClient(client)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <ClientForm 
                      initialData={client}
                      onSuccess={() => mutate("/api/clients")}
                      onClose={() => {
                        setIsEditOpen(false);
                        setSelectedClient(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(client);
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
              This action cannot be undone. This will permanently delete the client
              {selectedClient && ` "${selectedClient.name}"`} and remove their data
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedClient(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClient && handleDelete(selectedClient)}
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
