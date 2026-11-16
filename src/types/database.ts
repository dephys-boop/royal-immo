export type UserRole = 'super_admin' | 'admin' | 'agency' | 'agent' | 'individual' | 'customer';
export type TransactionType = 'sale' | 'rent' | 'seasonal';
export type PropertyStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_validation'
  | 'published'
  | 'rejected'
  | 'expired'
  | 'archived';
export type FeaturedBadge = 'featured' | 'new' | 'exclusive' | 'price_reduced' | 'verified';
export type PaymentProvider = 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave' | 'card' | 'manual';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  role: UserRole;
  city: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Agency {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  address: string;
  city: string;
  commune: string | null;
  phone: string;
  whatsapp: string | null;
  email: string;
  rccm_number: string | null;
  is_verified: boolean;
  is_active: boolean;
  listings_count?: number;
  created_at: string;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  member_role: 'director' | 'senior_agent' | 'agent' | 'assistant';
  can_publish: boolean;
  can_manage_contracts: boolean;
  is_active: boolean;
  joined_at: string;
}

export interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface LocationItem {
  id: string;
  city: string;
  commune: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export interface PublicationPlan {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price_fcfa: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  storage_path: string;
  public_url: string;
  is_cover: boolean;
  sort_order: number;
}

export interface Property {
  id: string;
  reference: string;
  slug: string;
  owner_id: string;
  owner_name?: string;
  owner_phone?: string;
  owner_whatsapp?: string;
  agency_id: string | null;
  agency_name?: string;
  agency_verified?: boolean;
  agent_id: string | null;
  category_id: string;
  category_name: string;
  title: string;
  description: string;
  transaction: TransactionType;
  price_fcfa: number;
  price_period: 'total' | 'month' | 'day' | 'year' | null;
  city: string;
  commune: string;
  quartier: string;
  public_address_hint: string | null;
  show_exact_address: boolean;
  latitude: number | null;
  longitude: number | null;
  surface_m2: number;
  bedrooms: number;
  bathrooms: number;
  has_garage: boolean;
  has_pool: boolean;
  has_garden: boolean;
  is_furnished: boolean;
  amenities: string[];
  video_url: string | null;
  availability_date: string | null;
  status: PropertyStatus;
  rejection_reason: string | null;
  featured_badge: FeaturedBadge | null;
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  plan_id: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  images: PropertyImage[];
  is_demo?: boolean;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_name?: string;
  property_id: string;
  property_title?: string;
  plan_id: string;
  plan_name?: string;
  amount_fcfa: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  external_reference: string | null;
  payer_phone: string | null;
  manual_reference: string | null;
  manual_proof_url: string | null;
  invoice_number?: string;
  created_at: string;
}

export interface VisitRequest {
  id: string;
  property_id: string;
  property_title?: string;
  requester_id: string | null;
  agency_id: string | null;
  owner_id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string | null;
  preferred_date: string;
  message: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ContractRecord {
  id: string;
  agency_id: string;
  property_id: string | null;
  property_title?: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  contract_type: 'sale' | 'lease' | 'management';
  amount_fcfa: number;
  deposit_fcfa: number;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'terminated' | 'expired';
}

export interface RentalPaymentRecord {
  id: string;
  agency_id: string;
  contract_id: string;
  client_name?: string;
  property_title?: string;
  period_label: string;
  due_date: string;
  amount_fcfa: number;
  paid_at: string | null;
  receipt_number: string | null;
  payment_method: string | null;
  status: 'due' | 'paid' | 'late' | 'cancelled';
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type:
    | 'new_listing'
    | 'listing_approved'
    | 'listing_rejected'
    | 'payment_confirmed'
    | 'payment_failed'
    | 'listing_expiring'
    | 'listing_expired'
    | 'new_visit'
    | 'new_message'
    | 'system';
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReportItem {
  id: string;
  property_id: string;
  property_title?: string;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface AdminLogItem {
  id: string;
  admin_name: string;
  action: string;
  target_table: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PropertySearchFilters {
  query: string;
  city: string;
  commune: string;
  quartier: string;
  transaction: '' | TransactionType;
  category: string;
  priceMin: string;
  priceMax: string;
  bedroomsMin: string;
  bathroomsMin: string;
  surfaceMin: string;
  surfaceMax: string;
  hasGarage: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  furnishedOnly: boolean;
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
}
