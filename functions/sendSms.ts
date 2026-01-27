Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { phoneNumber, queueName, ticketSeq, messageOverride } = body;

    if (!phoneNumber) {
      return Response.json({ ok: false, error: "Missing phoneNumber" }, { status: 400 });
    }

    const apiKey = Deno.env.get("SMS_PROXY_KEY");
    
    if (!apiKey) {
      return Response.json({ ok: false, error: "SMS_PROXY_KEY not configured" }, { status: 500 });
    }

    const phone = String(phoneNumber).replace(/[^\d]/g, '');
    const message = messageOverride || `שוק העיר\nמחלקת ${queueName}\nמספר: ${ticketSeq}`;

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

    const responseText = await smsResponse.text();

    return Response.json({
      ok: smsResponse.ok,
      status: smsResponse.status,
      response: responseText
    });

  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: error.message || "Unknown error" 
    }, { status: 500 });
  }
});