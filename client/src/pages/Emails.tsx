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
import { Plus, Search, Mail, Archive, Trash2, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
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
  
  const { data: response, error, isLoading, mutate } = useSWR<{ success: boolean; data: Email[] }>("/api/emails");
  const { toast } = useToast();
  
  // Ensure emails is always an array with proper error handling
  const emails = response?.data || [];
  
  // Safe filtering with null checks
  const filteredEmails = emails.filter(email => {
    if (!email || !search) return true;
    const searchLower = search.toLowerCase();
    return (
      (email?.subject?.toLowerCase() || '').includes(searchLower) ||
      (email?.fromEmail?.toLowerCase() || '').includes(searchLower) ||
      (email?.toEmail?.toLowerCase() || '').includes(searchLower)
    );
  }).sort((a, b) => {
    if (sortBy === "date") {
      const dateA = new Date(a?.createdAt || 0).getTime();
      const dateB = new Date(b?.createdAt || 0).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    }
    const subjectA = a?.subject || '';
    const subjectB = b?.subject || '';
    return sortOrder === "desc"
      ? subjectB.localeCompare(subjectA)
      : subjectA.localeCompare(subjectB);
  });

  const fetchNewEmails = async () => {
    try {
      const response = await fetch('/api/emails/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch new emails: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        await mutate();
        toast({
          title: "Success",
          description: "New emails fetched successfully",
        });
      } else {
        throw new Error(result.message || 'Failed to fetch new emails');
      }
    } catch (error) {
      console.error('Email fetch error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch new emails",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (email: Email, newStatus: string) => {
    try {
      if (!email?.id) {
        throw new Error('Invalid email ID');
      }

      const response = await fetch(`/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update email status');
      }

      await mutate();
      toast({
        title: "Success",
        description: "Email status updated successfully",
      });
    } catch (error) {
      console.error('Status update error:', error);
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
        <div className="flex flex-col items-center space-y-2">
          <div className="text-xl font-semibold text-destructive">
            Error Loading Emails
          </div>
          <div className="text-center text-muted-foreground">
            {error instanceof Error 
              ? error.message 
              : "We encountered an issue while loading your emails. Please try again later."}
          </div>
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
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground">Loading emails...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Inbox</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchNewEmails}>
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
                  mutate();
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

      {filteredEmails.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search ? "No emails match your search" : "No emails found"}
        </div>
      ) : (
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
            {filteredEmails.map((email) => (
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
      )}

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
