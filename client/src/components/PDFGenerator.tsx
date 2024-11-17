import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Offer, OfferItem, Product, Client } from 'db/schema';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: '100%',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    minHeight: 30,
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 5,
  },
  total: {
    marginTop: 20,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
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
          <Text style={styles.title}>{offer.title}</Text>
          <Text style={styles.value}>Offer #{offer.id}</Text>
          <Text style={styles.value}>
            Valid until: {format(new Date(offer.validUntil), 'PP')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Client Information</Text>
          <Text style={styles.value}>{client.name}</Text>
          <Text style={styles.value}>{client.email}</Text>
          <Text style={styles.value}>{client.phone}</Text>
          <Text style={styles.value}>{client.address}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Product</Text>
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
                <Text style={styles.tableCell}>{item.product.name}</Text>
                <Text style={styles.tableCell}>{item.quantity}</Text>
                <Text style={styles.tableCell}>${item.unitPrice}</Text>
                <Text style={styles.tableCell}>{item.discount}%</Text>
                <Text style={styles.tableCell}>${total.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.total}>Total Amount: ${total.toFixed(2)}</Text>

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
      // Fetch additional data needed for the PDF
      const [clientResponse, itemsResponse] = await Promise.all([
        fetch(`/api/clients/${offer.clientId}`),
        fetch(`/api/offers/${offer.id}/items`)
      ]);

      const client = await clientResponse.json();
      const items = await itemsResponse.json();

      // Create PDF in a new window
      const win = window.open('', '_blank');
      if (win) {
        win.document.write('<div id="pdf" style="height: 100vh;"></div>');
        const container = win.document.getElementById('pdf');
        if (container) {
          const root = createRoot(container);
          root.render(
            <PDFViewer style={{ width: '100%', height: '100%' }}>
              <OfferPDF offer={offer} client={client} items={items} />
            </PDFViewer>
          );
        }
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  }
};

export default PDFGenerator;
