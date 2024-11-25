-- Seed data for products
INSERT INTO products (name, description, price, sku, image_url)
VALUES 
  ('Professional Website Package', 'Complete website development with responsive design', 2999.99, 'WEB001', 'https://example.com/web.jpg'),
  ('E-commerce Solution', 'Full-featured online store setup', 3999.99, 'ECOM001', 'https://example.com/ecom.jpg'),
  ('Mobile App Development', 'Custom mobile application development', 4999.99, 'APP001', 'https://example.com/app.jpg'),
  ('SEO Package', 'Complete search engine optimization service', 999.99, 'SEO001', 'https://example.com/seo.jpg'),
  ('Cloud Infrastructure Setup', 'Enterprise cloud infrastructure configuration', 1999.99, 'CLOUD001', 'https://example.com/cloud.jpg');

-- Seed data for clients
INSERT INTO clients (name, email, phone, address, vat_number, country_code, client_type)
VALUES 
  ('TechCorp Solutions', 'contact@techcorp.com', '+48123456789', 'ul. Technologiczna 1, Warsaw', 'PL1234567890', 'PL', 'direct'),
  ('Digital Ventures', 'info@digitalventures.eu', '+49987654321', 'Digitalstraße 42, Berlin', 'DE9876543210', 'DE', 'partner'),
  ('Innovation Labs', 'hello@innovationlabs.co.uk', '+44123123123', '123 Innovation Street, London', 'GB123456789', 'GB', 'direct'),
  ('Smart Systems', 'contact@smartsystems.fr', '+33456789123', '42 Rue de l''Innovation, Paris', 'FR456789123', 'FR', 'partner'),
  ('Nordic Tech', 'info@nordictech.se', '+46789123456', 'Teknikvägen 10, Stockholm', 'SE789123456', 'SE', 'direct');

-- Seed data for settings
INSERT INTO settings (company_name, company_email, company_phone, company_address, company_vat_number, company_logo)
VALUES 
  ('Offer Management System', 'contact@offermgmt.com', '+48555666777', 'ul. Główna 1, 00-001 Warsaw, Poland', 'PL5556667770', 'https://example.com/logo.png')
ON CONFLICT DO NOTHING;
