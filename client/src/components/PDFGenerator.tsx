import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { createRoot } from "react-dom/client";
import type { Offer, OfferItem, Product, Client } from "db/schema";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerContent: {
    flex: 1,
    marginLeft: 40,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  infoGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 6,
  },
  infoCardTitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "medium",
  },
  infoText: {
    fontSize: 10,
    color: "#111827",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  table: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    breakInside: "avoid-page",
    pageBreakInside: "avoid",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    minHeight: 40,
    alignItems: "center",
    breakInside: "avoid-page",
    pageBreakInside: "avoid",
    avoidPageBreakInside: "always",
  },
  tableRowWrapper: {
    width: "100%",
    breakInside: "avoid-page",
    pageBreakInside: "avoid",
    avoidPageBreakInside: "always",
    marginBottom: 1,
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    fontSize: 10,
    color: "#374151",
  },
  tableCellProduct: {
    width: "40%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderRightStyle: "solid",
  },
  productImage: {
    width: 30,
    height: 30,
    marginRight: 8,
    borderRadius: 4,
  },
  tableCellQuantity: {
    width: "15%",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderRightStyle: "solid",
  },
  tableCellPrice: {
    width: "15%",
    textAlign: "right",
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderRightStyle: "solid",
  },
  tableCellDiscount: {
    width: "15%",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderRightStyle: "solid",
  },
  tableCellTotal: {
    width: "15%",
    textAlign: "right",
    paddingRight: 8,
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '250px',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 6,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  totalsValue: {
    fontSize: 10,
    color: "#374151",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
  },
  totalLabel: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 15,
  },
});

interface OfferPDFProps {
  offer: Offer;
  client: Client;
  items: (OfferItem & { product: Product })[];
  fileName: string;
}

function OfferPDF({ offer, client, items, fileName }: OfferPDFProps) {
  const totals = items.reduce((acc, item) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = subtotal * (item.discount / 100);
    const itemTotal = subtotal - discount;
    return {
      subtotal: acc.subtotal + subtotal,
      discount: acc.discount + discount,
      total: acc.total + itemTotal
    };
  }, { subtotal: 0, discount: 0, total: 0 });

  const vat = offer.includeVat === true ? totals.total * 0.23 : 0;
  const total = totals.total + vat;

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <Document title={fileName} author="ReiterWelt">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text>LOGO</Text>
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{offer.title}</Text>
            <Text style={styles.subtitle}>
              Offer {client.name}{" "}
              {offer.validUntil ? `valid until ${format(new Date(offer.validUntil), "PP")}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Client Information</Text>
              <Text style={styles.infoText}>{client.name}</Text>
              <Text style={styles.infoText}>{client.email}</Text>
              <Text style={styles.infoText}>{client.phone || "-"}</Text>
              <Text style={styles.infoText}>
                {capitalizeFirstLetter(client.clientType)}
              </Text>
              <Text style={styles.infoText}>{client.vatNumber || "-"}</Text>
              <Text style={styles.infoText}>{client.address || "-"}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Company Information</Text>
              <Text style={styles.infoText}>Reiter Welt sp. z o.o.</Text>
              <Text style={styles.infoText}>Mickiewicza 13/4</Text>
              <Text style={styles.infoText}>82-300 Elblag</Text>
              <Text style={styles.infoText}>Poland</Text>
              <Text style={styles.infoText}>VAT ID: PL5783158871</Text>
              <Text style={styles.infoText}>office@reiterwelt.eu</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableCellProduct]}>
              Product
            </Text>
            <Text style={[styles.tableCell, styles.tableCellQuantity]}>
              Quantity
            </Text>
            <Text style={[styles.tableCell, styles.tableCellPrice]}>
              Unit Price
            </Text>
            <Text style={[styles.tableCell, styles.tableCellDiscount]}>
              Discount
            </Text>
            <Text style={[styles.tableCell, styles.tableCellTotal]}>Total</Text>
          </View>

          {items.map((item) => {
            const subtotal = item.quantity * item.unitPrice;
            const discount = subtotal * (item.discount / 100);
            const total = subtotal - discount;

            return (
              <View key={item.id} style={styles.tableRowWrapper}>
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.tableCellProduct]}>
                    {item.product.imageUrl ? (
                      <Image
                        src={item.product.imageUrl}
                        style={styles.productImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.productImage,
                          { backgroundColor: "#f4f4f4" },
                        ]}
                      />
                    )}
                    <Text>{item.product.name}</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellQuantity]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellPrice]}>
                    €{Number(item.unitPrice).toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellDiscount]}>
                    {item.discount}%
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellTotal]}>
                    €{total.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.totalsSection, { breakInside: 'avoid', pageBreakInside: 'avoid' }]}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>€{totals.total.toFixed(2)}</Text>
          </View>
          {offer.includeVat && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT (23%):</Text>
              <Text style={styles.totalsValue}>€{vat.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalsRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated document and needs no signature.
        </Text>
      </Page>
    </Document>
  );
}

const PDFGenerator = {
  async generateOffer(offer: Offer) {
    try {
      if (!offer?.id) {
        throw new Error("Invalid offer data");
      }

      const [clientResponse, itemsResponse] = await Promise.all([
        fetch(`/api/clients/${offer.clientId}`),
        fetch(`/api/offers/${offer.id}/items`),
      ]);

      if (!clientResponse.ok || !itemsResponse.ok) {
        throw new Error("Failed to fetch required data");
      }

      const client = await clientResponse.json();
      const items = await itemsResponse.json();

      if (!client || !Array.isArray(items)) {
        throw new Error("Invalid response data");
      }

      const fileName = `Offer ${client.name}${offer.validUntil ? ` valid ${format(new Date(offer.validUntil), "PP")}` : ""}`;

      // Create the window first
      const win = window.open("", "_blank");
      if (!win) {
        throw new Error("Failed to open new window");
      }

      // Generate PDF blob
      const blob = await pdf(
        <OfferPDF
          offer={offer}
          client={client}
          items={items}
          fileName={fileName}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);

      // Write the complete HTML structure with updated styling
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${fileName}</title>
            <style>
              .download-button {
                position: fixed;
                top: 8px;
                right: 80px;
                z-index: 1000;
                background-color: #0ea5e9;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: background-color 0.2s;
                box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
              }
              .download-button:hover {
                background-color: #0284c7;
              }
              .download-button svg {
                width: 16px;
                height: 16px;
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0;">
            <div id="pdf" style="height: 100vh;"></div>
            <button class="download-button">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
            <script>
              window.history.pushState({}, '', '/${fileName}');

              // Add click handler for the download button
              document.querySelector('.download-button').onclick = function() {
                const link = document.createElement('a');
                link.href = '${url}';
                link.download = '${fileName}.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              };
            </script>
          </body>
        </html>
      `);
      win.document.close();

      const container = win.document.getElementById("pdf");
      if (!container) {
        throw new Error("Failed to create PDF container");
      }

      const root = createRoot(container);
      root.render(
        <PDFViewer style={{ width: "100%", height: "100%" }}>
          <OfferPDF
            offer={offer}
            client={client}
            items={items}
            fileName={fileName}
          />
        </PDFViewer>,
      );

      // Clean up when the window is closed
      win.onbeforeunload = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      throw error;
    }
  },
};

export default PDFGenerator;
