Deno.serve(async (req) => {
  const body = await req.json();
  const apiKey = Deno.env.get("SMS_PROXY_KEY");
  
  const phone = String(body.phoneNumber).replace(/[^\d]/g, '');
  const message = body.messageOverride || `שוק העיר - מחלקת ${body.queueName} - מספר: ${body.ticketSeq}`;

  const response = await fetch("http://84.110.65.94:2000/send-sms", {
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

  const text = await response.text();
  
  return new Response(JSON.stringify({
    ok: response.ok,
    status: response.status,
    response: text
  }), {
    headers: { "Content-Type": "application/json" }
  });
});