export default async function checkIPAccess(context) {
  const { base44, params } = context;

  try {
    const clientIP = params.clientIP;
    console.log('[checkIPAccess] Checking IP:', clientIP);

    // Get all allowed IPs using asServiceRole
    const allowedIPs = await base44.asServiceRole.entities.AllowedIP.list();
    console.log('[checkIPAccess] Found', allowedIPs.length, 'allowed IPs in database');

    // If no IPs configured, allow access
    if (allowedIPs.length === 0) {
      console.log('[checkIPAccess] No IPs configured, allowing access');
      return {
        allowed: true,
        clientIP
      };
    }

    // Check if client IP is in allowed list and active
    // Trim and normalize IPs for comparison
    const normalizedClientIP = clientIP?.trim();
    
    console.log('[checkIPAccess] Normalized client IP:', normalizedClientIP);
    console.log('[checkIPAccess] Allowed IPs:', allowedIPs.map(ip => ({ 
      ip: ip.ip_address, 
      active: ip.is_active,
      trimmed: ip.ip_address?.trim()
    })));
    
    const isAllowed = allowedIPs.some(
      ip => ip.is_active && ip.ip_address?.trim() === normalizedClientIP
    );

    console.log('[checkIPAccess] Access allowed:', isAllowed);

    return {
      allowed: isAllowed,
      clientIP: normalizedClientIP
    };
  } catch (error) {
    console.error('[checkIPAccess] Error:', error);
    return {
      allowed: false,
      clientIP: params?.clientIP || 'unknown',
      error: error.message
    };
  }
}