export const translations = {
  en: {
    offer: {
      title: "Offer",
      validUntil: "valid until",
      client: "Client Information",
      company: "Company Information",
      product: "Product",
      quantity: "Quantity",
      unitPrice: "Unit Price",
      discount: "Discount",
      subtotal: "Subtotal",
      total: "Total",
      vat: "VAT",
      notes: "Notes",
      status: "Status",
      phone: "Phone",
      email: "Email",
      address: "Address",
      vatNumber: "VAT ID"
    }
  },
  pl: {
    offer: {
      title: "Oferta",
      validUntil: "ważna do",
      client: "Informacje o kliencie",
      company: "Informacje o firmie",
      product: "Produkt",
      quantity: "Ilość",
      unitPrice: "Cena jednostkowa",
      discount: "Rabat",
      subtotal: "Suma częściowa",
      total: "Suma",
      vat: "VAT",
      notes: "Uwagi",
      status: "Status",
      phone: "Telefon",
      email: "Email",
      address: "Adres",
      vatNumber: "NIP"
    }
  },
  de: {
    offer: {
      title: "Angebot",
      validUntil: "gültig bis",
      client: "Kundeninformationen",
      company: "Unternehmensinformationen",
      product: "Produkt",
      quantity: "Menge",
      unitPrice: "Stückpreis",
      discount: "Rabatt",
      subtotal: "Zwischensumme",
      total: "Gesamt",
      vat: "MwSt",
      notes: "Notizen",
      status: "Status",
      phone: "Telefon",
      email: "E-Mail",
      address: "Adresse",
      vatNumber: "USt-IdNr"
    }
  },
  fr: {
    offer: {
      title: "Offre",
      validUntil: "valable jusqu'au",
      client: "Informations client",
      company: "Informations société",
      product: "Produit",
      quantity: "Quantité",
      unitPrice: "Prix unitaire",
      discount: "Remise",
      subtotal: "Sous-total",
      total: "Total",
      vat: "TVA",
      notes: "Notes",
      status: "Statut",
      phone: "Téléphone",
      email: "Email",
      address: "Adresse",
      vatNumber: "N° TVA"
    }
  }
};

export const currencyFormats = {
  EUR: { symbol: '€', locale: 'de-DE' },
  PLN: { symbol: 'zł', locale: 'pl-PL' }
};

export function formatCurrency(amount: number, currency: keyof typeof currencyFormats): string {
  const { locale, symbol } = currencyFormats[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}
