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
} from "@/components/ui/dialog";
import { Plus, Search, Mail, Star, Trash2, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useSWR, { mutate } from "swr";
import type { Email } from "db/schema";
import { format } from "date-fns";

export default function Emails() {
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const { data: emails } = useSWR<Email[]>("/api/emails");
  const { toast } = useToast();
  
  const filteredEmails = emails?.filter(email => 
    email.subject.toLowerCase().includes(search.toLowerCase()) ||
    email.fromEmail.toLowerCase().includes(search.toLowerCase()) ||
    email.toEmail.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = async (email: Email, newStatus: string) => {
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update email status');
      }

      mutate("/api/emails");
      toast({
        title: "Success",
        description: "Email status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Inbox</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Compose Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            {/* Email composition form will be added here */}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search emails..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>From</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmails?.map((email) => (
            <TableRow key={email.id} className={email.isRead === 'false' ? 'font-medium' : ''}>
              <TableCell>
                <Mail className={`h-4 w-4 ${email.isRead === 'false' ? 'text-primary' : 'text-muted-foreground'}`} />
              </TableCell>
              <TableCell>{email.fromEmail}</TableCell>
              <TableCell>{email.subject}</TableCell>
              <TableCell>{format(new Date(email.createdAt), 'PP')}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange(email, 'archived')}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange(email, 'trash')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
