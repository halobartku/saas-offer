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
import { Plus, Search, Image, Edit, Trash2 } from "lucide-react";
import { Upload } from "lucide-react";
import ProductForm from "@/components/ProductForm";
import { useToast } from "@/hooks/use-toast";
import useSWR, { mutate } from "swr";
import type { Product } from "db/schema";

export default function Products() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortField, setSortField] = useState<"name" | "sku" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { data: products } = useSWR<Product[]>("/api/products");
  const { toast } = useToast();
  
  const filteredProducts = products
    ?.filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      
      const aValue = a[sortField]?.toLowerCase() ?? "";
      const bValue = b[sortField]?.toLowerCase() ?? "";
      
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

  const handleSort = (field: "name" | "sku") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      toast({
        title: "Success",
        description: "Product has been deleted successfully",
      });

      mutate("/api/products");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setSelectedProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          <label htmlFor="csv-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <div>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append("file", file);

                    try {
                      const response = await fetch("/api/products/bulk-import", {
                        method: "POST",
                        body: formData,
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Failed to import products");
                      }

                      const result = await response.json();
                      const summary = result.summary;
                      
                      let description = `Imported ${summary.inserted} new products`;
                      if (summary.updated > 0) description += `, updated ${summary.updated} existing products`;
                      if (summary.skipped > 0) description += `, skipped ${summary.skipped} invalid entries`;
                      if (summary.errors > 0) description += `. ${summary.errors} errors occurred`;
                      
                      toast({
                        title: "Import Complete",
                        description,
                        duration: 5000,
                      });

                      if (result.details.errors.length > 0) {
                        console.error("Import errors:", result.details.errors);
                      }

                      mutate("/api/products");
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to import products",
                        variant: "destructive",
                      });
                    }
                    // Reset the input
                    e.target.value = "";
                  }}
                />
              </div>
            </Button>
          </label>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ProductForm 
                onSuccess={() => {
                  mutate("/api/products");
                  setIsCreateOpen(false);
                }}
                onClose={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("name")}
            >
              Name
              {sortField === "name" && (
                <span className="ml-2">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("sku")}
            >
              SKU
              {sortField === "sku" && (
                <span className="ml-2">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts?.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-10 h-10 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell>€{Number(product.price).toFixed(2)}</TableCell>
              <TableCell>{product.description}</TableCell>
              <TableCell className="text-right space-x-2">
                <Dialog 
                  open={isEditOpen && selectedProduct?.id === product.id}
                  onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (!open) setSelectedProduct(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <ProductForm 
                      initialData={product}
                      onSuccess={() => {
                        mutate("/api/products");
                        setIsEditOpen(false);
                        setSelectedProduct(null);
                      }}
                      onClose={() => {
                        setIsEditOpen(false);
                        setSelectedProduct(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(product);
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
              This action cannot be undone. This will permanently delete the product
              {selectedProduct && ` "${selectedProduct.name}"`} and remove its data
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProduct && handleDelete(selectedProduct)}
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
