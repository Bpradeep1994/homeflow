// Shared API types — the contract between apps/api and apps/admin-web.
// Consume via a `file:../../packages/types` dependency (or npm workspaces later).

export type UserRole = "customer" | "provider" | "admin";
export type UserStatus = "ACTIVE" | "BLOCKED";

export type VerificationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export type BookingStatus =
  | "PENDING" // customer-facing: "Searching Provider"
  | "ASSIGNED"
  | "ON_THE_WAY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED";

export type PaymentMethod = "UPI" | "CARD" | "CASH";
export type PaymentStatus = "PAID" | "REFUNDED";

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface ProviderProfile {
  id: string;
  user: User;
  experienceYears: number;
  services: string[];
  city?: string;
  serviceAreas: string[];
  verificationStatus: VerificationStatus;
  idDocumentUrl?: string;
  rating: number;
  jobsDone: number;
  online: boolean;
}

export interface SubService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string;
  quoteOnVisit: boolean;
  emergency: boolean;
  active: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  emoji: string;
  services: SubService[];
}

export interface Booking {
  id: string;
  customer: User;
  provider?: User | null;
  services: SubService[];
  address: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  amount: number;
  history: { status: BookingStatus; at: string }[];
  createdAt: string;
}

export interface Payment {
  id: string;
  booking: Booking;
  method: PaymentMethod;
  amount: number;
  commission: number;
  payout: number;
  status: PaymentStatus;
  settledAt?: string | null;
  createdAt: string;
}
