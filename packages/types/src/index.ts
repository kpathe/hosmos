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
    details?: Record<string, any>;
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

export interface LoginOwnerRequest {
  email: string;
  password_plain: string;
}

export interface LoginManagerRequest {
  username: string;
  password_plain: string;
}

export interface LoginHostellerRequest {
  identifier: string; // username or email
  password_plain: string;
}

export interface SendHostellerOtpRequest {
  email: string;
}

export interface SendHostellerOtpResponse {
  message: string;
  cooldown_seconds: number;
}

export interface RegisterHostellerRequest {
  email: string; // Used to look up the admitted record
  otp: string; // 6-digit numeric OTP sent to the email
  password_plain: string;
}

export interface ChangePasswordRequest {
  old_password_plain: string;
  new_password_plain: string;
}

export interface ForgotPasswordRequest {
  email: string;
  user_type?: "hosteller" | "manager" | "owner";
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password_plain: string;
}

// ─── Hostel ───────────────────────────────────────────────────────────────────

export interface HostelDto {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  electricity_rate_paise: number;
  security_deposit_amount_paise: number;
  late_fine_amount_paise: number;
  created_at: string;
}

export interface CreateHostelRequest {
  slug?: string;
  name: string;
  address?: string;
  electricity_rate_paise?: number;
  security_deposit_amount_paise?: number;
  late_fine_amount_paise?: number;
}

export interface UpdateHostelRequest {
  slug?: string;
  name?: string;
  address?: string;
  electricity_rate_paise?: number;
  security_deposit_amount_paise?: number;
  late_fine_amount_paise?: number;
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export interface ManagerDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface CreateManagerRequest {
  name: string;
  email: string;
  password_plain: string;
  phone?: string;
}

export interface UpdateManagerRequest {
  name?: string;
  phone?: string;
  password_plain?: string; // Optional password reset
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

export interface CreatePricingModelRequest {
  name: string;
  charging_basis: ChargingBasis;
  monthly_amount_paise: number;
  compatible_capacity: number;
  compatible_floors?: string[];
  is_active?: boolean;
}

export interface UpdatePricingModelRequest {
  name?: string;
  charging_basis?: ChargingBasis;
  monthly_amount_paise?: number;
  compatible_capacity?: number;
  compatible_floors?: string[];
  is_active?: boolean;
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

export interface CreateRoomRequest {
  room_number: string;
  floor: string;
  capacity: number;
  pricing_model_id?: string;
}

export interface CreateRoomsBulkRequest {
  start_number: number;
  end_number: number;
  prefix?: string;
  floor: string;
  capacity: number;
  pricing_model_id?: string;
}

export interface UpdateRoomRequest {
  room_number?: string;
  floor?: string;
  capacity?: number;
  pricing_model_id?: string | null;
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
  name_slug: string | null;
  created_at: string;
}

// NOTE: aadhaar_number is never included in API responses (security)

export interface CreateAdmissionRequest {
  name: string;
  father_name: string;
  email: string;
  phone: string;
  college?: string;
  branch?: string;
  address?: string;
  aadhaar_number?: string;
  admission_date: string;
  room_id: string;
  security_deposit_amount_paise: number;
  advance_months: number;
  payment_mode: PaymentMode;
  payment_date: string;
  payment_reference?: string;
  payment_description?: string;
}

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

export interface HostellerDetailsDto {
  hosteller: HostellerDto;
  current_room: RoomOccupancyDto | null;
  security_deposit: SecurityDepositDto | null;
  bills: BillDto[];
  payments: PaymentDto[];
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

export interface GenerateBillsRequest {
  year: number;
  month: number;
}

export interface GenerateBillsResponse {
  billsCreated: number;
  billsSkipped: number;
}

export interface AddBillItemRequest {
  item_type: BillItemType;
  description: string;
  amount_paise: number;
}

export interface UpdateBillItemRequest {
  description?: string;
  amount_paise?: number;
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

export interface RecordPaymentRequest {
  hosteller_id: string;
  bill_id: string;
  payment_date: string;
  amount_paise: number;
  mode: PaymentMode;
  description?: string;
  reference?: string;
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

// ─── Portal DTOs ─────────────────────────────────────────────────────────────

export interface PortalProfileDto {
  hosteller: HostellerDto;
  hostel: HostelDto;
  security_deposit: SecurityDepositDto | null;
  current_room: {
    id: string;
    room_number: string;
    floor: string;
    capacity: number;
  } | null;
  active_bill_count: number;
  total_outstanding_paise: number;
  last_payment: PaymentDto | null;
}

export interface PortalRoomDto {
  room: {
    id: string;
    room_number: string;
    floor: string;
    capacity: number;
    active_occupant_count?: number;
  };
  pricing_model: {
    name: string;
    monthly_amount_paise: number;
  } | null;
  roommates: Array<{
    id: string;
    name: string;
    admission_date: string;
    phone?: string | null;
  }>;
  meter_readings: MeterReadingDto[];
}
