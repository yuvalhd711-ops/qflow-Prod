export default async function checkIPAccess(context) {
  const { base44 } = context;

  try {
    // Get client IP from request headers
    const clientIP = context.request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() 
      || context.request?.headers?.['x-real-ip'] 
      || context.request?.connection?.remoteAddress 
      || 'unknown';

    console.log('[checkIPAccess] Client IP:', clientIP);

    // Get all allowed IPs
    const allowedIPs = await base44.entities.AllowedIP.list();
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
    const isAllowed = allowedIPs.some(
      ip => ip.is_active && ip.ip_address === clientIP
    );

    console.log('[checkIPAccess] Access allowed:', isAllowed);

    return {
      allowed: isAllowed,
      clientIP
    };
  } catch (error) {
    console.error('[checkIPAccess] Error:', error);
    // On error, allow access (fail open)
    return {
      allowed: true,
      clientIP: 'error',
      error: error.message
    };
  }
}