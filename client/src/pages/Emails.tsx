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
import { Plus, Search, Mail, Star, Trash2, Archive, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useSWR, { mutate } from "swr";
import type { Email } from "db/schema";
import { format } from "date-fns";
import { EmailComposer } from "@/components/EmailComposer";
import { EmailViewer } from "@/components/EmailViewer";

export default function Emails() {
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "subject">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { data: emails, error, isLoading, mutate } = useSWR<Email[]>("/api/emails");
  const { toast } = useToast();
  
  const filteredEmails = emails?.filter(email => 
    email.subject.toLowerCase().includes(search.toLowerCase()) ||
    email.fromEmail.toLowerCase().includes(search.toLowerCase()) ||
    email.toEmail.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === "date") {
      return sortOrder === "desc" 
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortOrder === "desc"
      ? b.subject.localeCompare(a.subject)
      : a.subject.localeCompare(b.subject);
  });

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center text-destructive">
          {error instanceof Error ? error.message : "Failed to load emails"}
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Inbox</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate("/api/emails")}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Compose Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <EmailComposer
                onClose={() => setIsComposeOpen(false)}
                onSuccess={() => {
                  setIsComposeOpen(false);
                  mutate("/api/emails");
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
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
            <TableHead>
              <Button
                variant="ghost"
                className="p-0 font-bold hover:bg-transparent"
                onClick={() => {
                  if (sortBy === "subject") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("subject");
                    setSortOrder("asc");
                  }
                }}
              >
                Subject
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                className="p-0 font-bold hover:bg-transparent"
                onClick={() => {
                  if (sortBy === "date") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("date");
                    setSortOrder("desc");
                  }
                }}
              >
                Date
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmails?.map((email) => (
            <TableRow 
              key={email.id} 
              className={`${email.isRead === 'false' ? 'font-medium' : ''} cursor-pointer hover:bg-muted/50`}
              onClick={() => {
                setSelectedEmail(email);
                setIsViewOpen(true);
              }}
            >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(email, 'archived');
                  }}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(email, 'trash');
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedEmail && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <EmailViewer
              email={selectedEmail}
              onClose={() => {
                setIsViewOpen(false);
                setSelectedEmail(null);
              }}
              onReply={(email) => {
                setIsViewOpen(false);
                setSelectedEmail(null);
                setIsComposeOpen(true);
              }}
              onDelete={async (email) => {
                await handleStatusChange(email, 'trash');
                setIsViewOpen(false);
                setSelectedEmail(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
