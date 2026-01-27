Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("SMS_PROXY_KEY") || "";
    const body = await req.json();
    
    const phone = String(body.phoneNumber || "").replace(/[^\d]/g, '');
    const message = body.messageOverride || `שוק העיר - ${body.queueName} - ${body.ticketSeq}`;

    const smsRes = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "X-API-Key": apiKey 
      },
      body: JSON.stringify({ 
        Cli: phone, 
        Text: message, 
        MsgId: `q${Date.now()}` 
      })
    });

    const txt = await smsRes.text();
    
    return new Response(
      JSON.stringify({ 
        ok: smsRes.ok, 
        status: smsRes.status, 
        response: txt 
      }), 
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message 
      }), 
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
});