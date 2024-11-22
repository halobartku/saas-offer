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
router.get('/validate/:vatNumber', async (req, res) => {
  const startTime = new Date().toISOString();
  console.log('VAT Validation Request:', {
    vatNumber: req.params.vatNumber,
    timestamp: startTime
  });

  try {
    const fullVatNumber = req.params.vatNumber;
    if (fullVatNumber.length < 3) {
      throw new Error('VAT number must be at least 3 characters long');
    }

    const countryCode = fullVatNumber.substring(0, 2).toUpperCase();
    const vatNumber = sanitizeVatNumber(fullVatNumber.substring(2));

    console.log('VAT Number Processing:', {
      fullVatNumber,
      extractedCountryCode: countryCode,
      extractedVatNumber: vatNumber,
      timestamp: new Date().toISOString()
    });

    if (!validateCountryCode(countryCode)) {
      throw new Error(`Invalid country code: ${countryCode}. Must be a valid EU country code.`);
    }

    if (!vatNumber) {
      throw new Error('VAT number cannot be empty after sanitization');
    }
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
        timeout: 15000, // 15 second timeout
        validateStatus: status => status < 500 // Allow non-500 responses for proper error handling
      });
    });

    console.log('VIES Service Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers['content-type'],
      timestamp: new Date().toISOString()
    });

    // Check content type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('xml')) {
      console.error('Invalid content type received:', {
        contentType,
        responseData: response.data,
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid response format from VIES service - Expected XML');
    }

    // Log raw response for debugging
    console.log('Raw VIES Service Response:', {
      data: response.data,
      timestamp: new Date().toISOString()
    });

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
      const parseOptions = {
        explicitArray: false,
        ignoreAttrs: true,
        tagNameProcessors: [(name: string) => name.replace(/^.*:/, '')],
        valueProcessors: [(value: string) => value.trim()],
        preserveChildrenOrder: true,
        explicitCharkey: true,
        trim: false
      };

      result = await parseStringPromise(response.data, parseOptions);
      
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

    // Navigate through the XML structure
    const envelope = result.Envelope || result['soap:Envelope'];
    const body = envelope?.Body || envelope?.['soap:Body'];
    const checkVatResponse = body?.checkVatResponse || body?.CheckVatResponse;

    if (!checkVatResponse) {
      console.error('Failed to extract checkVatResponse from:', result);
      throw new Error('Invalid response structure from VIES service - checkVatResponse not found');
    }

    // Extract validation result
    const validString = String(checkVatResponse.valid).toLowerCase();
    const valid = validString === 'true' || validString === '1' || validString === 'yes';

    // Log validation details
    console.log('Validation Details:', {
      rawValid: checkVatResponse.valid,
      parsedValid: valid,
      validString,
      timestamp: new Date().toISOString()
    });

    // Process name and address with proper handling of special characters and line breaks
    const name = checkVatResponse.name ? 
      decodeURIComponent(escape(checkVatResponse.name.toString().trim())) : '';

    // Handle multiline address while preserving formatting
    const address = checkVatResponse.address ? 
      decodeURIComponent(escape(checkVatResponse.address.toString()))
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n') : '';

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
