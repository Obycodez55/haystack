/**
 * Cache TTL configuration by data type and volatility
 */
export const CACHE_TTL_STRATEGY = {
  // Frequently changing data - short TTL
  provider: {
    health: 60,        // 1 minute - provider health changes frequently
    config: 300,       // 5 minutes - configs change occasionally
  },
  
  // Moderately changing data - medium TTL
  payment: {
    status: 300,       // 5 minutes - payment status can change
    details: 600,      // 10 minutes - payment details rarely change
  },
  
  // Rarely changing data - long TTL
  tenant: {
    info: 900,         // 15 minutes - tenant info changes rarely
    settings: 1800,    // 30 minutes - settings change infrequently
  },
  
  // Static/read-only data - very long TTL
  reference: {
    currencies: 86400,  // 24 hours - currencies don't change
    countries: 86400,  // 24 hours - countries don't change
  },
};

