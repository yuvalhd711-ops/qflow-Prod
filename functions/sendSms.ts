Deno.serve(async (req) => {
  console.log("[sendSms] Function invoked");
  try {
    const body = await req.json();
    console.log("[sendSms] Body parsed:", { phone: body.phoneNumber, queue: body.queueName, seq: body.ticketSeq });
    
    const key = Deno.env.get("SMS_PROXY_KEY");
    const phone = String(body.phoneNumber).replace(/\D/g, '');
    const msg = body.messageOverride || `שוק העיר - ${body.queueName} - מספר: ${body.ticketSeq}`;
    
    console.log("[sendSms] Calling proxy with phone:", phone);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
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
    console.error("[sendSms] Error:", e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(e) 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});