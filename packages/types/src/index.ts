// ─────────────────────────────────────────────────────────────────────────────
// Hosmos Shared API Types
// These types define the shape of API request and response bodies shared
// between the backend (Node.js) and frontend (Next.js).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums ───────────────────────────────────────────────────────────────────

export type HostellerStatus = "admitted" | "active" | "exit_pending" | "removed";
export type ChargingBasis = "PER_SEAT" | "FULL_ROOM";
export type BillStatus = "unpaid" | "paid";
export type BillItemType =
  | "rent"
  | "electricity"
  | "security_deposit"
  | "advance_allocation"
  | "late_fine"
  | "adjustment"
  | "other";
export type PaymentMode = "cash" | "cheque" | "upi";
export type SecurityDepositStatus = "held" | "settled";
export type UserRole = "owner" | "manager" | "hosteller";
export type ExitType = "normal" | "without_notice" | "early_approved";

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]> | unknown;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  role: UserRole;
  hostel_id?: string; // Only for hostellers
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    hostel_id?: string;
  };
}

// ─── Hostel ───────────────────────────────────────────────────────────────────

export interface HostelDto {
  id: string;
  name: string;
  address: string | null;
  electricity_rate_paise: number;
  security_deposit_amount_paise: number;
  late_fine_amount_paise: number;
  created_at: string;
}

// ─── Pricing Model ────────────────────────────────────────────────────────────

export interface PricingModelDto {
  id: string;
  hostel_id: string;
  name: string;
  charging_basis: ChargingBasis;
  monthly_amount_paise: number;
  compatible_capacity: number;
  compatible_floors: string[];
  is_active: boolean;
  created_at: string;
}

// ─── Room ─────────────────────────────────────────────────────────────────────

export interface RoomDto {
  id: string;
  hostel_id: string;
  room_number: string;
  floor: string;
  capacity: number;
  pricing_model_id: string | null;
  pricing_model: PricingModelDto | null;
  active_occupant_count: number; // Derived
  created_at: string;
}

// ─── Hosteller ────────────────────────────────────────────────────────────────

export interface HostellerDto {
  id: string;
  hostel_id: string;
  name: string;
  father_name: string | null;
  email: string;
  phone: string | null;
  college: string | null;
  branch: string | null;
  address: string | null;
  admission_date: string;
  status: HostellerStatus;
  username: string | null;
  created_at: string;
}

// NOTE: aadhaar_number is never included in API responses (security)

// ─── Room Occupancy ───────────────────────────────────────────────────────────

export interface RoomOccupancyDto {
  id: string;
  room_id: string;
  room_number: string;
  floor: string;
  hosteller_id: string;
  effective_from: string;
  effective_to: string | null;
}

// ─── Bill ─────────────────────────────────────────────────────────────────────

export interface BillItemDto {
  id: string;
  item_type: BillItemType;
  description: string;
  amount_paise: number;
  created_at: string;
}

export interface BillDto {
  id: string;
  hostel_id: string;
  hosteller_id: string;
  hosteller_name: string;
  billing_period_year: number;
  billing_period_month: number;
  status: BillStatus;
  total_amount_paise: number;
  items: BillItemDto[];
  generated_at: string;
  paid_at: string | null;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentDto {
  id: string;
  hostel_id: string;
  hosteller_id: string;
  hosteller_name: string;
  bill_id: string;
  record_number: string;
  payment_date: string;
  amount_paise: number;
  mode: PaymentMode;
  description: string | null;
  reference: string | null;
  created_at: string;
}

// ─── Advance Rent Allocation ──────────────────────────────────────────────────

export interface AdvanceRentAllocationDto {
  id: string;
  billing_period_year: number;
  billing_period_month: number;
  amount_paise: number;
}

// ─── Security Deposit ─────────────────────────────────────────────────────────

export interface SecurityDepositDto {
  id: string;
  original_amount_paise: number;
  deductions_paise: number;
  refunded_amount_paise: number | null;
  settlement_date: string | null;
  settlement_notes: string | null;
  status: SecurityDepositStatus;
}

// ─── Meter Reading ────────────────────────────────────────────────────────────

export interface MeterReadingDto {
  id: string;
  room_id: string;
  room_number: string;
  reading_value: number;
  reading_date: string;
  is_reset: boolean;
  notes: string | null;
  consumption?: number; // Derived: current - previous
  cost_paise?: number; // Derived: consumption × rate
  recorded_at: string;
}

// ─── Admission Response ───────────────────────────────────────────────────────

export interface AdmissionResultDto {
  hosteller: HostellerDto;
  room: Pick<RoomDto, "id" | "room_number" | "floor">;
  admission_bill: BillDto;
  advance_allocations: AdvanceRentAllocationDto[];
  security_deposit: SecurityDepositDto;
  payment: PaymentDto;
}

// ─── Exit Settlement ──────────────────────────────────────────────────────────

export interface ExitSettlementDto {
  hosteller_id: string;
  exit_date: string;
  exit_type: ExitType;
  security_deposit: SecurityDepositDto;
  outstanding_balance_paise: number;
  damage_deductions_paise: number;
  net_refund_paise: number; // Negative means hosteller owes money
}
