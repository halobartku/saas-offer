import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { createRoot } from "react-dom/client";
import type { Offer, OfferItem, Product, Client } from "db/schema";

// Register the font with Polish character support
Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Roboto",
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
    width: 160,
    height: 60,
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
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
  },
  tableRow: {
    width: "100%",
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    paddingVertical: 8,
  },
  tableRowWrapper: {
    width: "100%",
    breakInside: "avoid-page",
    pageBreakInside: "avoid",
    marginBottom: 8,
    paddingVertical: 4,
  },
  tableContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
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
  totalsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  totalsLabel: {
    fontSize: 10,
    color: "#6b7280",
    width: "85%",
    textAlign: "right",
    paddingRight: 8,
  },
  totalsValue: {
    fontSize: 10,
    color: "#374151",
    width: "15%",
    textAlign: "right",
    paddingRight: 8,
  },
  totalRow: {
    backgroundColor: "#f9fafb",
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
  settings: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    companyVatNumber: string;
    companyLogo: string;
    companyFooter?: string;
  };
}

function OfferPDF({ offer, client, items, fileName, settings }: OfferPDFProps) {
  const totals = items.reduce(
    (acc, item) => {
      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      const discount = subtotal * (Number(item.discount || 0) / 100);
      const itemTotal = subtotal - discount;
      return {
        subtotal: acc.subtotal + subtotal,
        discount: acc.discount + discount,
        total: acc.total + itemTotal,
      };
    },
    { subtotal: 0, discount: 0, total: 0 },
  );

  const vat = offer.includeVat === 'true' ? totals.total * 0.23 : 0;
  const total = totals.total + vat;
  const exchangeRate = Number(offer.exchangeRate) || 4.3;

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <Document title={fileName} author="ReiterWelt">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            {settings.companyLogo ? (
              <Image src={settings.companyLogo} style={styles.logo} />
            ) : (
              <Text>LOGO</Text>
            )}
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{offer.title}</Text>
            <Text style={styles.subtitle}>
              Offer {client.name}{" "}
              {offer.validUntil
                ? `valid until ${format(new Date(offer.validUntil), "PP")}`
                : ""}
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
              <Text style={styles.infoText}>{settings.companyName}</Text>
              <Text style={styles.infoText}>{settings.companyAddress}</Text>
              {settings.companyVatNumber && (
                <Text style={styles.infoText}>
                  VAT ID: {settings.companyVatNumber}
                </Text>
              )}
              <Text style={styles.infoText}>{settings.companyEmail}</Text>
              {settings.companyPhone && (
                <Text style={styles.infoText}>
                  Phone: {settings.companyPhone}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableContent}>
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
              <Text style={[styles.tableCell, styles.tableCellTotal]}>
                Total
              </Text>
            </View>
          </View>

          {items.map((item) => {
            const subtotal = Number(item.quantity) * Number(item.unitPrice);
            const discount = subtotal * (Number(item.discount) / 100);
            const total = subtotal - discount;

            return (
              <View key={item.id} style={styles.tableRowWrapper}>
                <View style={styles.tableRow}>
                  <View style={styles.tableContent}>
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
                      {offer.currency === 'EUR' ? 
                         `€${Number(item.unitPrice).toFixed(2)}` :
                         `PLN ${(Number(item.unitPrice) * Number(offer.exchangeRate)).toFixed(2)}`
                       }
                       {offer.currency === 'PLN' && ` (€${Number(item.unitPrice).toFixed(2)})`}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellDiscount]}>
                      {item.discount}%
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellTotal]}>
                      €{total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Subtotal Row */}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>
              {offer.currency === 'EUR' ?
                `€${totals.total.toFixed(2)}` :
                `PLN ${(totals.total * Number(offer.exchangeRate)).toFixed(2)} (€${totals.total.toFixed(2)})`}
            </Text>
          </View>

          {/* VAT Row (if applicable) */}
          {offer.includeVat && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT (23%):</Text>
              <Text style={styles.totalsValue}>
                {offer.currency === 'EUR' ?
                  `€${vat.toFixed(2)}` :
                  `PLN ${(vat * Number(offer.exchangeRate)).toFixed(2)} (€${vat.toFixed(2)})`}
              </Text>
            </View>
          )}

          {/* Total Row */}
          <View style={[styles.totalsRow, styles.totalRow]}>
            <Text style={[styles.totalsLabel, styles.totalLabel]}>Total:</Text>
            <Text style={[styles.totalsValue, styles.totalValue]}>
              {offer.currency === 'EUR' ?
                `€${total.toFixed(2)}` :
                `PLN ${(total * Number(offer.exchangeRate)).toFixed(2)} (€${total.toFixed(2)})`}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {settings.companyFooter || "ReiterWelt More Than Horse Jumps"}
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

      const [clientResponse, itemsResponse, settingsResponse] =
        await Promise.all([
          fetch(`/api/clients/${offer.clientId}`),
          fetch(`/api/offers/${offer.id}/items`),
          fetch("/api/settings"),
        ]);

      if (!clientResponse.ok || !itemsResponse.ok || !settingsResponse.ok) {
        throw new Error("Failed to fetch required data");
      }

      const client = await clientResponse.json();
      const items = await itemsResponse.json();
      const settings = await settingsResponse.json();

      if (!client || !Array.isArray(items) || !settings) {
        throw new Error("Invalid response data");
      }

      const fileName = `Offer ${client.name}${offer.validUntil ? ` valid ${format(new Date(offer.validUntil), "PP")}` : ""}`;

      const win = window.open("", "_blank");
      if (!win) {
        throw new Error("Failed to open new window");
      }

      const blob = await pdf(
        <OfferPDF
          offer={offer}
          client={client}
          items={items}
          fileName={fileName}
          settings={settings}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);

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
            settings={settings}
          />
        </PDFViewer>,
      );

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
