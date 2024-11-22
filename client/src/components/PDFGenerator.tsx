import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { createRoot } from 'react-dom/client';
import type { Offer, OfferItem, Product, Client } from 'db/schema';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 10,
  },
  headerContent: {
    flex: 1,
    marginLeft: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  value: {
    fontSize: 12,
    marginBottom: 8,
  },
  table: {
    display: 'table',
    width: '100%',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    minHeight: 24,
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 10,
  },
  total: {
    marginTop: 16,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
});

interface OfferPDFProps {
  offer: Offer;
  client: Client;
  items: (OfferItem & { product: Product })[];
}

function OfferPDF({ offer, client, items }: OfferPDFProps) {
  const total = items.reduce((sum, item) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = subtotal * (item.discount / 100);
    return sum + (subtotal - discount);
  }, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text>LOGO</Text>
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{offer.title}</Text>
            <Text style={styles.value}>Offer #{offer.id}</Text>
            <Text style={styles.value}>
              Valid until: {format(new Date(offer.validUntil), 'PP')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Client Information</Text>
          <Text style={styles.value}>{client.name}</Text>
          <Text style={styles.value}>{client.email}</Text>
          {client.phone && <Text style={styles.value}>{client.phone}</Text>}
          {client.address && <Text style={styles.value}>{client.address}</Text>}
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Product</Text>
            <Text style={styles.tableCell}>Quantity</Text>
            <Text style={styles.tableCell}>Unit Price</Text>
            <Text style={styles.tableCell}>Discount</Text>
            <Text style={styles.tableCell}>Total</Text>
          </View>

          {items.map((item) => {
            const subtotal = item.quantity * item.unitPrice;
            const discount = subtotal * (item.discount / 100);
            const total = subtotal - discount;

            return (
              <View key={item.id} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                  {item.product.imageUrl ? (
                    <Image
                      src={item.product.imageUrl}
                      style={{ width: 30, height: 30, marginRight: 8, borderRadius: 4 }}
                    />
                  ) : (
                    <View style={{ width: 30, height: 30, marginRight: 8, backgroundColor: '#f4f4f4', borderRadius: 4 }} />
                  )}
                  <Text>{item.product.name}</Text>
                </View>
                <Text style={styles.tableCell}>{item.quantity}</Text>
                <Text style={styles.tableCell}>€{Number(item.unitPrice).toFixed(2)}</Text>
                <Text style={styles.tableCell}>{item.discount}%</Text>
                <Text style={styles.tableCell}>€{total.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.total}>Total Amount: €{total.toFixed(2)}</Text>

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
        throw new Error('Invalid offer data');
      }

      // Fetch additional data needed for the PDF
      const [clientResponse, itemsResponse] = await Promise.all([
        fetch(`/api/clients/${offer.clientId}`),
        fetch(`/api/offers/${offer.id}/items`)
      ]);

      if (!clientResponse.ok || !itemsResponse.ok) {
        throw new Error('Failed to fetch required data');
      }

      const client = await clientResponse.json();
      const items = await itemsResponse.json();

      if (!client || !Array.isArray(items)) {
        throw new Error('Invalid response data');
      }

      // Create PDF in a new window
      const win = window.open('', '_blank');
      if (!win) {
        throw new Error('Failed to open new window');
      }

      const fileName = `Offer ${client.name} ${format(new Date(offer.validUntil), 'yyyy-MM-dd')}`;
      win.document.title = fileName;
      win.document.write('<div id="pdf" style="height: 100vh;"></div>');
      const container = win.document.getElementById('pdf');
      if (!container) {
        throw new Error('Failed to create PDF container');
      }

      const root = createRoot(container);
      root.render(
        <PDFViewer style={{ width: '100%', height: '100%' }}>
          <OfferPDF offer={offer} client={client} items={items} />
        </PDFViewer>
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      // Re-throw the error to be handled by the component
      throw error;
    }
  }
};

export default PDFGenerator;
