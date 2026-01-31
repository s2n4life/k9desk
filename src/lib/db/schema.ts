export enum JobState {
  Scheduled = 'scheduled',
  ReminderSent = 'reminder_sent',
  InProgress = 'in_progress',
  Completed = 'completed',
  PaymentRequested = 'payment_requested',
  Paid = 'paid',
  Closed = 'closed',
  Cancelled = 'cancelled',
  NoShow = 'no_show'
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number; // DEPRECATED: No longer used. Scheduling now uses global appointment_duration_minutes from Settings.
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string; // Unique identifier
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Pet {
  id: string;
  customerId: string;
  name: string;
  breed?: string;
  notes?: string; // Persistent notes (allergies, etc)
  size?: string;
  age?: string; // or birthYear if preferred, but user asked for age
  createdAt: number;
  updatedAt: number;
}

export interface Job {
  id: string;
  customerId: string;
  petIds: string[];
  state: JobState;
  scheduledDate: string; // ISO date string YYYY-MM-DD
  scheduledTime: string; // HH:mm
  address: string;
  customerNotes?: string; // Copy of customer notes at time of job
  petNotes?: string; // Copy of pet notes at time of job
  jobNotes?: string; // Visit-specific notes
  services?: (Service & { petId?: string })[];
  payment_amount?: number;
  payment_method?: 'cash' | 'check' | 'venmo' | 'zelle' | 'stripe' | 'other';
  payment_logged_at?: number;
  payment_source?: 'manual';
  recurrenceRuleId?: string; // Link to recurrence rule if this is a recurring job
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  id: string; // 'default'
  businessName?: string;
  venmo?: string; // Handle or link
  zelle?: string; // Phone or email
  paypal?: string; // PayPal.me link
  cashapp?: string; // $Cashtag
  custom_url?: string; // Any other link
  review_url?: string; // Link for reviews
  onboardingCompleted?: boolean;

  // Subscription Fields
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_start_date?: string; // ISO String
  trial_end_date?: string;   // ISO String
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_plan_id?: string;

  // Scheduling & Service Area
  schedule_start_hour?: number;
  schedule_end_hour?: number;
  schedule_work_days?: number[];
  appointment_duration_minutes?: number;
  drive_buffer_minutes?: number;
  service_area_mode?: 'radius' | 'zips';
  service_area_zips?: string[];


  // Advanced Schedule
  business_hours?: {
    [key: string]: { start: string; end: string; isOpen: boolean };
  };

  updatedAt: number;
}

export interface Lead {
  id: string;
  businessId: string;
  status: 'new' | 'contacted' | 'scheduled' | 'dead';
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerAddress?: string; // Added from booking form
  serviceAreaZip?: string;
  petDetails: {
    name: string;
    breed: string;
    weight: string;
    age: string;
  }[];
  preferredDates: string[];
  serviceIds?: string[]; // IDs of services requested
  waiverSigned: boolean;
  createdAt: string; // ISO from DB
  notes?: string;
}

export enum RecurrenceFrequency {
  Weekly = 'weekly',
  Biweekly = 'biweekly',
  Monthly = 'monthly',
  Every6Weeks = 'every_6_weeks',
  Every2Months = 'every_2_months'
}

export enum RecurrenceStatus {
  Active = 'active',
  Paused = 'paused',
  Canceled = 'canceled'
}

export interface RecurrenceRule {
  id: string;
  businessId: string;
  customerId: string;
  frequency: RecurrenceFrequency;
  intervalDays: number;
  status: RecurrenceStatus;
  nextRunDate?: string; // ISO date string
  lastGeneratedJobId?: string;
  createdAt: number;
  updatedAt: number;
}

export type SyncActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'CUSTOMER' | 'PET' | 'JOB' | 'SETTINGS' | 'SERVICE' | 'PROFILE' | 'LEAD' | 'RECURRENCE_RULE';

export type SyncQueueItem = {
  id: string;
  action: SyncActionType;
  entityType: EntityType;
  entityId: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  businessId?: string; // Active business ID at time of creation (respects impersonation)
};
