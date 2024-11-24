import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Get password from Replit Secrets
const PASSWORD = process.env.PASSWORD;

if (!PASSWORD) {
  throw new Error("Password not set in Replit Secrets");
}

interface PasswordProtectProps {
  children: React.ReactNode;
}

export function PasswordProtect({ children }: PasswordProtectProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("isAuthenticated", "true");
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    const authenticated = sessionStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(authenticated);
  }, []);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <AlertDialog open={!isAuthenticated}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter Password</AlertDialogTitle>
          <AlertDialogDescription>
            Please enter the password to access this application.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
          {error && (
            <p className="text-sm text-red-500">
              Incorrect password. Please try again.
            </p>
          )}
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
