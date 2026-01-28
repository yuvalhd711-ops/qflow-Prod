Deno.serve(async (req) => {
  console.log("[sendSms] Function invoked");
  let timeout;
  try {
    const body = await req.json();
    console.log("[sendSms] Body parsed:", { phone: body.phoneNumber, queue: body.queueName, seq: body.ticketSeq });
    
    const key = Deno.env.get("SMS_PROXY_KEY");
    const phone = String(body.phoneNumber).replace(/\D/g, '');
    const msg = body.messageOverride || `שוק העיר - ${body.queueName} - מספר: ${body.ticketSeq}`;
    
    console.log("[sendSms] Calling proxy with phone:", phone);
    
    const controller = new AbortController();
    timeout = setTimeout(() => {
      console.log("[sendSms] Timeout reached, aborting...");
      controller.abort();
    }, 5000);
    
    const r = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({ Cli: phone, Text: msg, MsgId: `q${Date.now()}` }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const t = await r.text();
    console.log("[sendSms] Proxy response:", r.status, t);
    
    return new Response(JSON.stringify({ 
      success: r.ok, 
      status: r.status, 
      data: t 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e) {
    if (timeout) clearTimeout(timeout);
    
    // Handle AbortError specifically
    if (e.name === 'AbortError') {
      console.error("[sendSms] Request aborted (timeout)");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "SMS_TIMEOUT",
        message: "שליחת SMS נכשלה - זמן תגובה ארוך מדי"
      }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    console.error("[sendSms] Error:", e.name, e.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e.name || "UNKNOWN_ERROR",
      message: e.message || String(e)
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});