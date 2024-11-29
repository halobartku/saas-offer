import 'express';

declare module 'express-serve-static-core' {
  interface Session {
    userId?: string;
    userRole?: string;
  }
}
