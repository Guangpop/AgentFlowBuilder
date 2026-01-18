export type TransactionType = 'topup' | 'charge';

export type EventType =
  | 'login'
  | 'logout'
  | 'topup'
  | 'charge'
  | 'api_request'
  | 'api_success'
  | 'api_error'
  | 'blocked'
  | 'webhook'
  | 'error';

export interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  balance: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  stripe_payment_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface WorkflowHistory {
  id: string;
  user_id: string;
  workflow_name: string;
  workflow_json: Record<string, unknown>;
  node_count: number;
  generated_prompt: string | null;
  cost: number;
  created_at: string;
  deleted_at: string | null;
}

export interface ServerLog {
  id: string;
  user_id: string | null;
  event_type: EventType;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
