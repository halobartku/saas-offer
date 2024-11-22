import { Router } from 'express';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const router = Router();

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY,
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i === retries - 1) break;
      
      const waitTime = initialDelay * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1}/${retries} after ${waitTime}ms delay`);
      await delay(waitTime);
    }
  }
  
  throw lastError;
}

// XML parsing options
const parseOptions = {
  explicitArray: false,
  ignoreAttrs: true,
  tagNameProcessors: [(name: string) => name.replace(/^.*:/, '')],
  valueProcessors: [(value: string) => value.trim()],
  strict: false,
  normalize: true,
  trim: true,
};

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

    // Make SOAP request with retry logic
    const response = await retryWithBackoff(async () => {
      console.log('Making SOAP request attempt...');
      return await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': ''
        },
        timeout: 15000 // 15 second timeout
      });
    });

    console.log('VIES Service Response Status:', response.status);
    console.log('Raw XML Response:', response.data);

    // Log raw XML response for debugging
    console.log('Raw SOAP Response:', {
      statusCode: response.status,
      headers: response.headers,
      rawData: response.data,
      timestamp: new Date().toISOString()
    });

    // Parse XML response with comprehensive options
    let result;
    try {
      result = await parseStringPromise(response.data, parseOptions);
      
      // Log complete parsed structure for debugging
      console.log('XML Parsing Result:', {
        rawKeys: Object.keys(result),
        envelopePresent: !!result.Envelope || !!result['soap:Envelope'],
        bodyPresent: !!(result.Envelope?.Body || result['soap:Envelope']?.['soap:Body']),
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error('XML Parsing Error:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        rawResponse: response.data,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to parse VIES service response');
    }
    
    console.log('Parsed VIES Response Structure:', {
      keys: Object.keys(result),
      depth1: result['Envelope'] ? Object.keys(result['Envelope']) : null,
      depth2: result['Envelope']?.['Body'] ? Object.keys(result['Envelope']['Body']) : null,
      timestamp: new Date().toISOString()
    });

    console.log('Complete Parsed Response:', JSON.stringify(result, null, 2));

    // Try different possible response structures
    const checkVatResponse = result['Envelope']?.['Body']?.['checkVatResponse'] || 
                           result['soap:Envelope']?.['soap:Body']?.['checkVatResponse'] ||
                           result['Envelope']?.['Body']?.['CheckVatResponse'];

    if (!checkVatResponse) {
      console.error('Failed to extract checkVatResponse from:', result);
      throw new Error('Invalid response structure from VIES service - checkVatResponse not found');
    }

    // Extract validation result with enhanced type checking
    const validString = String(checkVatResponse.valid).toLowerCase();
    const valid = validString === 'true' || validString === '1' || validString === 'yes';
    
    // Log validation details
    console.log('Validation Details:', {
      rawValid: checkVatResponse.valid,
      parsedValid: valid,
      validString,
      timestamp: new Date().toISOString()
    });

    // Handle name and address with better sanitization
    const name = checkVatResponse.name ? 
      checkVatResponse.name.toString().trim().replace(/\s+/g, ' ') : '';
    const address = checkVatResponse.address ? 
      checkVatResponse.address.toString().trim().replace(/\s+/g, ' ') : '';

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
