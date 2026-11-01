/**
 * API Response Types
 * 
 * Standardized response types for all API endpoints
 */

// Base API response structure
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  meta?: ResponseMeta;
}

// API error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string; // For validation errors
  timestamp?: string;
}

// Response metadata
export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
  cached?: boolean;
  cacheExpiry?: string;
}

// Paginated response structure
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: PaginationMeta;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

// Success response (for operations that don't return data)
export interface SuccessResponse {
  success: boolean;
  message: string;
  meta?: ResponseMeta;
}

// Upload response
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadId: string;
}

// Bulk operation response
export interface BulkOperationResponse<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: ApiError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<string, ServiceHealth>;
  version: string;
  uptime: number;
}

// Service health status
export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  error?: string;
}

// Search response
export interface SearchResponse<T> {
  results: T[];
  query: string;
  filters: Record<string, unknown>;
  suggestions: string[];
  totalResults: number;
  searchTime: number; // in milliseconds
  facets?: Record<string, SearchFacet[]>;
}

// Search facet
export interface SearchFacet {
  value: string;
  count: number;
  selected: boolean;
}

// Analytics response
export interface AnalyticsResponse {
  metrics: Record<string, number>;
  dimensions: Record<string, string | number>;
  period: {
    start: string;
    end: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  comparisons?: {
    previous: Record<string, number>;
    change: Record<string, number>;
    changePercent: Record<string, number>;
  };
}

// Validation error response
export interface ValidationErrorResponse extends ApiResponse<null> {
  error: ApiError & {
    code: 'VALIDATION_ERROR';
    validationErrors: ValidationError[];
  };
}

// Individual validation error
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Rate limit response
export interface RateLimitResponse {
  error: ApiError & {
    code: 'RATE_LIMIT_EXCEEDED';
  };
  retryAfter: number; // seconds
  limit: number;
  remaining: number;
  resetTime: string;
}

// Authentication response
export interface AuthResponse {
  user: {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  isNewUser: boolean;
  permissions: string[];
}

// Configuration response
export interface ConfigResponse {
  features: Record<string, boolean>;
  settings: Record<string, unknown>;
  version: {
    app: string;
    api: string;
    minSupported: string;
  };
  maintenance: {
    enabled: boolean;
    message?: string;
    estimatedEnd?: string;
  };
}

// Notification response
export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
  actions?: NotificationAction[];
}

// Notification action
export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  style?: 'default' | 'destructive';
}

// Export response
export interface ExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  estimatedSize?: number;
  progress?: number; // 0-100
}

// Webhook response
export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  eventId: string;
  eventType: string;
  timestamp: string;
  errors?: string[];
}