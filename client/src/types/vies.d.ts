declare module 'vies' {
  export interface ViesOptions {
    countryCode: string;
    vatNumber: string;
  }

  export interface ViesResponse {
    countryCode: string;
    vatNumber: string;
    requestDate: string;
    valid: boolean;
    name?: string;
    address?: string;
  }

  export default class Vies {
    validate(options: ViesOptions): Promise<ViesResponse>;
  }
}
