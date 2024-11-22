import { Router } from 'express';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const router = Router();

// Helper function to sanitize VAT number
const sanitizeVatNumber = (vatNumber: string): string => {
  return vatNumber.replace(/[^A-Za-z0-9]/g, '');
};

// VIES VAT validation endpoint
router.get('/validate/:countryCode/:vatNumber', async (req, res) => {
  console.log('VAT Validation Request:', {
    countryCode: req.params.countryCode,
    vatNumber: req.params.vatNumber,
    timestamp: new Date().toISOString()
  });

  try {
    const countryCode = req.params.countryCode.toUpperCase();
    const vatNumber = sanitizeVatNumber(req.params.vatNumber);

    console.log('Sanitized Input:', { countryCode, vatNumber });
    
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

    // Make SOAP request with timeout
    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': ''
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('VIES Service Response Status:', response.status);

    // Parse XML response
    const result = await parseStringPromise(response.data);
    console.log('Parsed VIES Response:', JSON.stringify(result, null, 2));

    const checkVatResponse = result['soap:Envelope']['soap:Body'][0]['checkVatResponse'][0];

    // Extract validation result
    const valid = checkVatResponse.valid[0] === 'true';
    const name = checkVatResponse.name ? checkVatResponse.name[0] : '';
    const address = checkVatResponse.address ? checkVatResponse.address[0] : '';

    const responseData = {
      valid,
      name: name.trim(),
      address: address.trim()
    };

    console.log('Validation Result:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('VAT validation error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    let errorMessage = 'Failed to validate VAT number';
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout - VIES service is not responding';
      } else if (error.response?.status === 404) {
        errorMessage = 'VIES service endpoint not found';
        statusCode = 404;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Unable to connect to VIES service';
      } else if (!error.response) {
        errorMessage = 'Network error - Unable to reach VIES service';
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
