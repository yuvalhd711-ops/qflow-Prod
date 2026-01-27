import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log("=== SMS Function Called ===");
  
  let body;
  try {
    body = await req.json();
    console.log("Request body:", JSON.stringify(body));
  } catch (e) {
    console.error("Failed to parse body:", e);
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { phoneNumber, queueName, ticketSeq, messageOverride } = body;

  if (!phoneNumber) {
    return new Response(JSON.stringify({ ok: false, error: "Missing phoneNumber" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = Deno.env.get("SMS_PROXY_KEY");
  console.log("API Key exists:", !!apiKey);
  
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "SMS_PROXY_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const phone = String(phoneNumber).replace(/[^\d]/g, '');
    const message = messageOverride || `שוק העיר\nמחלקת ${queueName}\nמספר: ${ticketSeq}`;

    console.log("Calling SMS proxy for:", phone);
    
    const smsResponse = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        Cli: phone,
        Text: message,
        MsgId: `qflow_${Date.now()}`
      })
    });

    const text = await smsResponse.text();
    console.log("SMS proxy returned:", text);

    return new Response(JSON.stringify({
      ok: smsResponse.ok,
      status: smsResponse.status,
      response: text
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Fetch error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});