import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log("=== sendSms START ===");
  
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    console.log("Body received:", body);
    
    const { phoneNumber, queueName, ticketSeq, messageOverride } = body;

    if (!phoneNumber || !queueName || !ticketSeq) {
      return Response.json({ ok: false, error: "Missing params" }, { status: 400 });
    }

    const apiKey = Deno.env.get("SMS_PROXY_KEY");
    console.log("API Key found:", !!apiKey);
    
    if (!apiKey) {
      return Response.json({ ok: false, error: "SMS_PROXY_KEY missing" }, { status: 500 });
    }

    const phone = String(phoneNumber).replace(/[^\d]/g, '');
    const message = messageOverride || `שוק העיר\nמחלקת ${queueName}\nמספר התור שלך: ${ticketSeq}`;

    console.log("Sending to:", phone);
    
    const smsResponse = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        Cli: phone,
        Text: message,
        MsgId: `kiosk_${Date.now()}`
      })
    });

    const responseText = await smsResponse.text();
    console.log("SMS Server response:", responseText);

    return Response.json({
      ok: smsResponse.status === 200,
      status: smsResponse.status,
      response: responseText
    });

  } catch (error) {
    console.error("ERROR:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});