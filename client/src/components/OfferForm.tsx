"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer, type Client } from "@/db/schema";
import { z } from "zod";
import { OfferFormProvider } from "@/context/OfferFormContext";
import { OfferDates } from "./offer/OfferDates";
import { OfferStatus } from "./offer/OfferStatus";
import { ProductList } from "./offer/ProductList";
import { SearchableCombobox } from "./offer/SearchableCombobox";
import { useOfferItems } from "@/hooks/use-offer-items";
import { Card, CardContent } from "@/components/ui/card";
import useSWR from "swr";

// ... rest of the file remains the same