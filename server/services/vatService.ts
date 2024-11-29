import { createErrorResponse } from '../types/api';

interface VatValidationResult {
  valid: boolean;
  name: string;
  address: string;
  countryCode: string;
  vatNumber: string;
  validationTimestamp: string;
}

export class VatService {
  private static readonly VIES_API_URL = 'http://ec.europa.eu/taxation_customs/vies/services/checkVatService';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static validateInput(countryCode: string, vatNumber: string): void {
    if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
      throw new Error('Invalid country code format. Must be a 2-letter ISO country code.');
    }
    if (!vatNumber || typeof vatNumber !== 'string' || vatNumber.length < 1) {
      throw new Error('Invalid VAT number format.');
    }
  }

  static async validateVAT(countryCode: string, vatNumber: string): Promise<VatValidationResult> {
    const startTime = new Date().toISOString();
    const requestId = `vat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('VAT Validation Request:', {
      requestId,
      countryCode,
      vatNumber,
      timestamp: startTime
    });

    try {
      // Input validation
      this.validateInput(countryCode, vatNumber);

      // Retry logic
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(this.VIES_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml;charset=UTF-8',
              'SOAPAction': '',
              'X-Request-ID': requestId
            },
            body: `
              <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
                <soapenv:Header/>
                <soapenv:Body>
                  <urn:checkVat>
                    <urn:countryCode>${countryCode}</urn:countryCode>
                    <urn:vatNumber>${vatNumber}</urn:vatNumber>
                  </urn:checkVat>
                </soapenv:Body>
              </soapenv:Envelope>
            `,
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000)
          });

          console.log('VIES Service Response:', {
            requestId,
            attempt,
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          });

          if (!response.ok) {
            throw new Error(`VIES service error: ${response.status} - ${response.statusText}`);
          }

          const xmlText = await response.text();
          
          // Validate XML structure
          if (!xmlText.includes('checkVatResponse')) {
            throw new Error('Invalid response structure from VIES service');
          }

          // Check for SOAP fault
          if (xmlText.includes('<faultcode>')) {
            const faultMatch = xmlText.match(/<faultstring>(.*?)<\/faultstring>/);
            throw new Error(`SOAP Fault: ${faultMatch ? faultMatch[1] : 'Unknown SOAP error'}`);
          }

          const valid = xmlText.includes('<ns2:valid>true</ns2:valid>');
          const nameMatch = xmlText.match(/<ns2:name>(.*?)<\/ns2:name>/);
          const addressMatch = xmlText.match(/<ns2:address>([\s\S]*?)<\/ns2:address>/);

          const result: VatValidationResult = {
            valid,
            name: nameMatch ? nameMatch[1].trim() : '',
            address: addressMatch ? addressMatch[1].trim() : '',
            countryCode,
            vatNumber,
            validationTimestamp: new Date().toISOString()
          };

          console.log('Validation Result:', {
            requestId,
            ...result,
            attempt,
            duration: `${Date.now() - new Date(startTime).getTime()}ms`
          });

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn('VAT validation attempt failed:', {
            requestId,
            attempt,
            error: lastError.message,
            timestamp: new Date().toISOString()
          });

          if (attempt < this.MAX_RETRIES) {
            const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
            await this.delay(delay);
          }
        }
      }

      // If we get here, all retries failed
      console.error('VAT validation failed after all retries:', {
        requestId,
        error: lastError?.message,
        attempts: this.MAX_RETRIES,
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - new Date(startTime).getTime()}ms`
      });

      throw new Error(`VAT validation failed: ${lastError?.message}`);
    } catch (error) {
      // Handle any errors that occurred outside the retry loop
      console.error('VAT validation error:', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - new Date(startTime).getTime()}ms`
      });

      throw error;
    }
  }
}
