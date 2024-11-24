import { createContext, useContext, ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { InsertOffer } from "db/schema";
import type { EnhancedOffer } from "@/components/OfferForm";
import { ErrorBoundary } from "react-error-boundary";

interface OfferFormContextType {
  form: UseFormReturn<EnhancedOffer>;
  onClose?: () => void;
  isSubmitting: boolean;
}

const OfferFormContext = createContext<OfferFormContextType | undefined>(
  undefined,
);

interface OfferFormProviderProps {
  children: ReactNode;
  value: OfferFormContextType;
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-4 text-destructive">
      <h2 className="font-semibold mb-2">Something went wrong:</h2>
      <pre className="text-sm mb-4">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md"
      >
        Try again
      </button>
    </div>
  );
}

export function OfferFormProvider({ children, value }: OfferFormProviderProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <OfferFormContext.Provider value={value}>
        {children}
      </OfferFormContext.Provider>
    </ErrorBoundary>
  );
}

export function useOfferForm() {
  const context = useContext(OfferFormContext);
  if (!context) {
    throw new Error("useOfferForm must be used within an OfferFormProvider");
  }
  return context;
}
