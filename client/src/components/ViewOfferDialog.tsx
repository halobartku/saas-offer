import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import type { Offer, Client, OfferItem, Product } from "db/schema";
import useSWR from "swr";
import { Loader2, Edit, User } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

interface ViewOfferDialogProps {
  offer: Offer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (offer: Offer) => void;
  onEditDialogOpen?: (open: boolean) => void;
}

export default function ViewOfferDialog({
  offer,
  open,
  onOpenChange,
  onEdit,
  onEditDialogOpen,
}: ViewOfferDialogProps) {
  const isMobile = useMobile();
  const { data: client } = useSWR<Client>(
    offer?.clientId ? `/api/clients/${offer.clientId}` : null,
  );
  const { data: items } = useSWR<(OfferItem & { product: Product })[]>(
    offer?.id ? `/api/offers/${offer.id}/items` : null,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "sent":
        return "bg-blue-500";
      case "accepted":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "Close & Paid":
        return "bg-slate-500";
      case "Paid & Delivered":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const calculateTotals = () => {
    if (!items) return { subtotal: 0, vat: 0, total: 0 };

    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * Number(item.unitPrice);
      const discount = itemSubtotal * (Number(item.discount || 0) / 100);
      return sum + (itemSubtotal - discount);
    }, 0);

    const vat = offer.includeVat ? subtotal * 0.23 : 0;

    return {
      subtotal,
      vat,
      total: subtotal + vat,
    };
  };

  const renderItemCard = (item: OfferItem & { product: Product }) => {
    const subtotal = item.quantity * Number(item.unitPrice);
    const discount = subtotal * (Number(item.discount || 0) / 100);
    const total = subtotal - discount;

    return (
      <div key={item.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Product</p>
          <p className="font-medium">{item.product.name}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Quantity</p>
            <p className="font-medium">{item.quantity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Unit Price</p>
            <p className="font-medium">€{Number(item.unitPrice).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
            <p className="font-medium">€{subtotal.toFixed(2)}</p>
          </div>
        </div>
        {Number(item.discount) > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Discount ({item.discount}%)
            </p>
            <p className="font-medium text-red-500">-€{discount.toFixed(2)}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total</p>
          <p className="font-medium">€{total.toFixed(2)}</p>
        </div>
      </div>
    );
  };

  const renderMobileLayout = () => (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="info">Information</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
      </TabsList>

      <div
        className="overflow-y-auto"
        style={{ maxHeight: "calc(90vh - 140px)" }}
      >
        <TabsContent value="info" className="mt-4 p-4">
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-3">Offer Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Title</p>
                  <p className="font-medium">{offer.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={getStatusColor(offer.status)}>
                    {offer.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Valid Until
                  </p>
                  <p className="font-medium">
                    {offer.validUntil
                      ? format(new Date(offer.validUntil), "PP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Last Contact
                  </p>
                  <p className="font-medium">
                    {offer.lastContact
                      ? format(new Date(offer.lastContact), "PP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Next Contact
                  </p>
                  <p className="font-medium">
                    {offer.nextContact
                      ? format(new Date(offer.nextContact), "PP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Notes
                  </p>
                  <p className="font-medium whitespace-pre-wrap">
                    {offer.notes || "No notes"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-3">Client Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contact Person</p>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <p className="font-medium">{client?.contactPerson || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{client?.email}</p>
                </div>
                {client?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
                {client?.address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Address
                    </p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="mt-4 p-4">
          <div className="space-y-4">
            {items?.map(renderItemCard)}
            <div className="border-t pt-4 space-y-2">
              <div className="text-right space-y-2">
                <p className="text-sm text-muted-foreground">
                  Subtotal: €{calculateTotals().subtotal.toFixed(2)}
                </p>
                {offer.includeVat && (
                  <p className="text-sm text-muted-foreground">
                    VAT (23%): €{calculateTotals().vat.toFixed(2)}
                  </p>
                )}
                <p className="text-lg font-medium">
                  Total: €{calculateTotals().total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );

  const renderDesktopLayout = () => (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="info">Information</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
      </TabsList>

      <div
        className="overflow-y-auto"
        style={{ maxHeight: "calc(90vh - 140px)" }}
      >
        <TabsContent value="info" className="mt-4 p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Offer Details</h3>
              <div className="space-y-4">
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
                    {offer.validUntil
                      ? format(new Date(offer.validUntil), "PP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Contact</p>
                  <p className="font-medium">
                    {offer.lastContact
                      ? format(new Date(offer.lastContact), "PP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Contact</p>
                  <p className="font-medium">
                    {offer.nextContact
                      ? format(new Date(offer.nextContact), "PP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">
                    {offer.notes || "No notes"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Client Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <p className="font-medium">{client?.contactPerson || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{client?.email}</p>
                </div>
                {client?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
                {client?.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="mt-4 p-4">
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="text-left py-2 font-medium text-sm text-muted-foreground">
                      Product
                    </th>
                    <th className="text-left py-2 font-medium text-sm text-muted-foreground">
                      Quantity
                    </th>
                    <th className="text-left py-2 font-medium text-sm text-muted-foreground">
                      Unit Price
                    </th>
                    <th className="text-right py-2 font-medium text-sm text-muted-foreground">
                      Subtotal
                    </th>
                    <th className="text-right py-2 font-medium text-sm text-muted-foreground">
                      Discount
                    </th>
                    <th className="text-right py-2 font-medium text-sm text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item) => {
                    const subtotal = item.quantity * Number(item.unitPrice);
                    const discount =
                      subtotal * (Number(item.discount || 0) / 100);
                    const total = subtotal - discount;

                    return (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">{item.product.name}</td>
                        <td className="py-3">{item.quantity}</td>
                        <td className="py-3">
                          €{Number(item.unitPrice).toFixed(2)}
                          
                        </td>
                        <td className="py-3 text-right">
                          €{subtotal.toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          {Number(item.discount || 0) > 0 ? (
                            <span className="text-red-500">
                              -{item.discount}% (-€{discount.toFixed(2)})
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 text-right">€{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="text-right space-y-2">
                <p className="text-sm text-muted-foreground">
                  Subtotal: €{calculateTotals().subtotal.toFixed(2)}
                </p>
                {offer.includeVat && (
                  <p className="text-sm text-muted-foreground">
                    VAT (23%): €{calculateTotals().vat.toFixed(2)}
                  </p>
                )}
                <p className="text-lg font-medium">
                  Total: €{calculateTotals().total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex justify-between items-center pr-8">
            <DialogTitle>View Offer</DialogTitle>
            <Button
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => {
                  if (onEditDialogOpen) {
                    onEditDialogOpen(true);
                  }
                  if (onEdit) {
                    onEdit(offer);
                  }
                }, 100);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        {!client || !items ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isMobile ? (
          renderMobileLayout()
        ) : (
          renderDesktopLayout()
        )}
      </DialogContent>
    </Dialog>
  );
}
