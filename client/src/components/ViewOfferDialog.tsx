import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Offer, Client, OfferItem, Product } from "db/schema";
import useSWR from "swr";
import { Loader2, Edit } from "lucide-react";

interface ViewOfferDialogProps {
  offer: Offer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewOfferDialog({ offer, open, onOpenChange }: ViewOfferDialogProps) {
  const { data: client } = useSWR<Client>(offer?.clientId ? `/api/clients/${offer.clientId}` : null);
  const { data: items } = useSWR<(OfferItem & { product: Product })[]>(
    offer?.id ? `/api/offers/${offer.id}/items` : null
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'accepted': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'Close & Paid': return 'bg-slate-500';
      case 'Paid & Delivered': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>View Offer</DialogTitle>
            <Button
              onClick={() => {
                onOpenChange(false);
                // Open edit dialog directly through state
                setIsEditOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        {(!client || !items) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Offer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{offer.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(offer.status)}>
                    {offer.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p className="font-medium">
                    {offer.validUntil ? format(new Date(offer.validUntil), 'PP') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">€{Number(offer.totalAmount).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
                {client.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
                {client.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const subtotal = item.quantity * Number(item.unitPrice);
                  const discount = subtotal * (Number(item.discount || 0) / 100);
                  const total = subtotal - discount;

                  return (
                    <div key={item.id} className="grid grid-cols-5 gap-4 p-3 border rounded-lg">
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Product</p>
                        <p className="font-medium">{item.product.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Unit Price</p>
                        <p className="font-medium">€{Number(item.unitPrice).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">€{total.toFixed(2)}</p>
                        {item.discount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Discount: {item.discount}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}