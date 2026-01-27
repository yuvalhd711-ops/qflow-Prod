Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const key = Deno.env.get("SMS_PROXY_KEY");
    
    const phone = String(body.phoneNumber).replace(/\D/g, '');
    const msg = body.messageOverride || `שוק העיר - ${body.queueName} - מספר: ${body.ticketSeq}`;
    
    const r = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({ Cli: phone, Text: msg, MsgId: `q${Date.now()}` })
    });
    
    const t = await r.text();
    
    return new Response(JSON.stringify({ 
      success: r.ok, 
      status: r.status, 
      data: t 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(e) 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});