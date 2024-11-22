import { Router } from 'express';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const router = Router();

// VIES VAT validation endpoint
router.get('/validate/:countryCode/:vatNumber', async (req, res) => {
  try {
    const { countryCode, vatNumber } = req.params;
    
    // VIES SOAP service URL
    const url = 'http://ec.europa.eu/taxation_customs/vies/services/checkVatService';
    
    // Construct SOAP envelope
    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:checkVat>
            <urn:countryCode>${countryCode}</urn:countryCode>
            <urn:vatNumber>${vatNumber}</urn:vatNumber>
          </urn:checkVat>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // Make SOAP request
    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': ''
      }
    });

    // Parse XML response
    const result = await parseStringPromise(response.data);
    const checkVatResponse = result['soap:Envelope']['soap:Body'][0]['checkVatResponse'][0];

    // Extract validation result
    const valid = checkVatResponse.valid[0] === 'true';
    const name = checkVatResponse.name ? checkVatResponse.name[0] : '';
    const address = checkVatResponse.address ? checkVatResponse.address[0] : '';

    res.json({
      valid,
      name: name.trim(),
      address: address.trim()
    });
  } catch (error) {
    console.error('VAT validation error:', error);
    res.status(500).json({
      error: 'Failed to validate VAT number',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
