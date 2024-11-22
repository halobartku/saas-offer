import { Router } from 'express';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const router = Router();

// Helper function to sanitize VAT number
const sanitizeVatNumber = (vatNumber: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  return vatNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
};

// Helper function to validate country code
const validateCountryCode = (countryCode: string): boolean => {
  const validEUCodes = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ];
  return validEUCodes.includes(countryCode.toUpperCase());
};

// VIES VAT validation endpoint
router.get('/validate/:countryCode/:vatNumber', async (req, res) => {
  const startTime = new Date().toISOString();
  console.log('VAT Validation Request:', {
    countryCode: req.params.countryCode,
    vatNumber: req.params.vatNumber,
    timestamp: startTime
  });

  try {
    const countryCode = req.params.countryCode.toUpperCase();
    if (!validateCountryCode(countryCode)) {
      throw new Error(`Invalid country code: ${countryCode}. Must be a valid EU country code.`);
    }

    const vatNumber = sanitizeVatNumber(req.params.vatNumber);
    if (!vatNumber) {
      throw new Error('VAT number cannot be empty after sanitization');
    }

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

    console.log('SOAP Request:', soapEnvelope);

    // Make SOAP request with timeout
    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': ''
      },
      timeout: 15000 // 15 second timeout
    });

    console.log('VIES Service Response Status:', response.status);
    console.log('Raw XML Response:', response.data);

    // Parse XML response
    const result = await parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true
    });
    console.log('Parsed VIES Response:', JSON.stringify(result, null, 2));

    // Verify the response structure
    if (!result['soap:Envelope'] || 
        !result['soap:Envelope']['soap:Body'] || 
        !result['soap:Envelope']['soap:Body']['checkVatResponse']) {
      throw new Error('Invalid response structure from VIES service');
    }

    const checkVatResponse = result['soap:Envelope']['soap:Body']['checkVatResponse'];

    // Extract validation result with type checking
    const valid = checkVatResponse.valid === 'true';
    const name = checkVatResponse.name ? checkVatResponse.name.trim() : '';
    const address = checkVatResponse.address ? checkVatResponse.address.trim() : '';

    const responseData = {
      valid,
      name,
      address,
      countryCode,
      vatNumber
    };

    console.log('Validation Result:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('VAT validation error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - new Date(startTime).getTime()}ms`
    });

    let errorMessage = 'Failed to validate VAT number';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Invalid country code')) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message === 'VAT number cannot be empty after sanitization') {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes('Invalid response structure')) {
        errorMessage = 'Invalid response from VIES service';
      }
    }

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
      } else if (error.response.status >= 500) {
        errorMessage = 'VIES service is currently unavailable';
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
