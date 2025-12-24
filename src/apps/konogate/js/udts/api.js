/**
 * KonoGate - API UDTs (ISA-95 Style)
 * Maps industrial hierarchy to API concepts:
 * Enterprise → Gateway | Site → Provider | Area → Service | WorkCenter → Endpoint
 */

// Gateway UDT (Enterprise level)
export const GatewayUDT = {
  name: 'Gateway',
  description: 'API Gateway instance',
  members: {
    ID: { type: 'String', default: '' },
    Name: { type: 'String', default: 'Default Gateway' },
    Status: { type: 'String', default: 'idle' }, // idle, running, error
    StartTime: { type: 'DateTime', default: null },
    TotalRequests: { type: 'Int4', default: 0 },
    BlockedRequests: { type: 'Int4', default: 0 },
    AvgLatency: { type: 'Float4', default: 0 },
    RateLimitGlobal: { type: 'Int4', default: 1000 } // req/min
  }
};

// Provider UDT (Site level)
export const ProviderUDT = {
  name: 'Provider',
  description: 'API provider/backend',
  members: {
    ID: { type: 'String', default: '' },
    Name: { type: 'String', default: '' },
    BaseURL: { type: 'String', default: '' },
    Type: { type: 'String', default: 'rest' }, // rest, graphql, grpc
    AuthType: { type: 'String', default: 'none' }, // none, apikey, bearer, basic
    AuthKey: { type: 'String', default: '' },
    Enabled: { type: 'Boolean', default: true },
    Timeout: { type: 'Int4', default: 30000 },
    RateLimit: { type: 'Int4', default: 100 }, // req/min per provider
    RequestCount: { type: 'Int4', default: 0 },
    ErrorCount: { type: 'Int4', default: 0 },
    LastRequest: { type: 'DateTime', default: null }
  }
};

// Service UDT (Area level)
export const ServiceUDT = {
  name: 'Service',
  description: 'API service grouping',
  members: {
    ID: { type: 'String', default: '' },
    ProviderID: { type: 'String', default: '' },
    Name: { type: 'String', default: '' },
    BasePath: { type: 'String', default: '' },
    Version: { type: 'String', default: 'v1' },
    Enabled: { type: 'Boolean', default: true },
    EndpointCount: { type: 'Int4', default: 0 }
  }
};

// Endpoint UDT (WorkCenter level)
export const EndpointUDT = {
  name: 'Endpoint',
  description: 'API endpoint definition',
  members: {
    ID: { type: 'String', default: '' },
    ServiceID: { type: 'String', default: '' },
    Method: { type: 'String', default: 'GET' },
    Path: { type: 'String', default: '' },
    Description: { type: 'String', default: '' },
    RateLimit: { type: 'Int4', default: 60 },
    CacheEnabled: { type: 'Boolean', default: false },
    CacheTTL: { type: 'Int4', default: 60 },
    RequiresAuth: { type: 'Boolean', default: false },
    Enabled: { type: 'Boolean', default: true },
    RequestCount: { type: 'Int4', default: 0 },
    AvgLatency: { type: 'Float4', default: 0 },
    LastCalled: { type: 'DateTime', default: null }
  }
};

// Request UDT (Work Order)
export const RequestUDT = {
  name: 'Request',
  description: 'API request record',
  members: {
    ID: { type: 'String', default: '' },
    EndpointID: { type: 'String', default: '' },
    Method: { type: 'String', default: '' },
    Path: { type: 'String', default: '' },
    Status: { type: 'Int4', default: 0 },
    Latency: { type: 'Float4', default: 0 },
    Timestamp: { type: 'DateTime', default: null },
    ClientIP: { type: 'String', default: '' },
    Blocked: { type: 'Boolean', default: false },
    BlockReason: { type: 'String', default: '' }
  }
};

// Rate Limit Rule UDT
export const RateLimitUDT = {
  name: 'RateLimit',
  description: 'Rate limiting configuration',
  members: {
    ID: { type: 'String', default: '' },
    Target: { type: 'String', default: 'global' }, // global, provider, endpoint, ip
    TargetID: { type: 'String', default: '' },
    MaxRequests: { type: 'Int4', default: 100 },
    WindowSeconds: { type: 'Int4', default: 60 },
    CurrentCount: { type: 'Int4', default: 0 },
    WindowStart: { type: 'DateTime', default: null }
  }
};

// Alert UDT
export const AlertUDT = {
  name: 'Alert',
  description: 'Security/anomaly alert',
  members: {
    ID: { type: 'String', default: '' },
    Severity: { type: 'String', default: 'info' }, // info, warn, critical
    Type: { type: 'String', default: '' }, // rate_limit, anomaly, error_spike, etc
    Message: { type: 'String', default: '' },
    Source: { type: 'String', default: '' },
    Timestamp: { type: 'DateTime', default: null },
    Acknowledged: { type: 'Boolean', default: false }
  }
};

// Create instance from UDT
export function createInstance(udt, data = {}) {
  const instance = {};
  for (const [key, def] of Object.entries(udt.members)) {
    instance[key] = data[key] !== undefined ? data[key] : def.default;
  }
  return instance;
}

// All UDTs
export const UDTs = {
  Gateway: GatewayUDT,
  Provider: ProviderUDT,
  Service: ServiceUDT,
  Endpoint: EndpointUDT,
  Request: RequestUDT,
  RateLimit: RateLimitUDT,
  Alert: AlertUDT
};
