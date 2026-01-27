export default async function sendSms(context) {
  try {
    console.log("=== sendSms function started ===");
    console.log("context.params:", JSON.stringify(context.params));
    console.log("context.secrets available:", Object.keys(context.secrets || {}));
    
    const { phoneNumber, queueName, ticketSeq, messageOverride, msgId } = context.params;

    // Validation
    if (!phoneNumber || !queueName || !ticketSeq) {
      console.log("ERROR: Missing parameters");
      return {
        ok: false,
        error: "Missing required parameters: phoneNumber, queueName, ticketSeq"
      };
    }

    // Check API key
    const apiKey = context.secrets?.SMS_PROXY_KEY;
    console.log("SMS_PROXY_KEY exists:", !!apiKey);
    console.log("SMS_PROXY_KEY value:", apiKey);
    
    if (!apiKey) {
      console.log("ERROR: SMS_PROXY_KEY not found in secrets");
      return {
        ok: false,
        error: "SMS_PROXY_KEY not configured in secrets"
      };
    }

  // Normalize phone number (digits only)
  const normalizedPhone = String(phoneNumber).trim().replace(/[^\d]/g, '');

  // Build default message
  const defaultMessageText = 
    'שוק העיר\n' +
    `מחלקת ${queueName}\n` +
    `מספר התור שלך: ${ticketSeq}\n\n` +
    'אתה כעת יכול להמשיך בקניות בסניף, אנחנו כבר נשלח לך תזכורת כשהתור יתקרב.\n\n' +
    'להצטרפות למועדון:\n' +
    'https://s1c.me/shukhair_01';

  const messageText = messageOverride || defaultMessageText;

  // Create payload
  const payload = {
    Cli: normalizedPhone,
    Text: messageText,
    MsgId: msgId || `kiosk_${queueName}_${ticketSeq}_${Date.now()}`
  };

  console.log("Sending SMS with payload:", { Cli: payload.Cli, MsgId: payload.MsgId, TextLength: payload.Text.length });
  
  try {
    // Send to SMS proxy server
    const response = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(payload)
    });

    // Parse response
    const responseText = await response.text();
    let proxyResponse;
    
    try {
      proxyResponse = JSON.parse(responseText);
    } catch {
      proxyResponse = { raw: responseText };
    }

    console.log("SMS Proxy HTTP Status:", response.status);
    console.log("SMS Proxy Response:", proxyResponse);

    // Success
    if (response.status === 200) {
      return {
        ok: true,
        status: response.status,
        proxyResponse
      };
    }

    // Error from proxy
    return {
      ok: false,
      error: `SMS Proxy error: HTTP ${response.status}`,
      status: response.status,
      proxyResponse
    };

  } catch (error) {
    console.error("=== SMS Function Error ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    return {
      ok: false,
      error: String(error),
      errorDetails: {
        message: error.message,
        stack: error.stack
      }
    };
  }
}

  } catch (topLevelError) {
    console.error("=== Top Level Function Error ===");
    console.error("Error:", topLevelError);
    return {
      ok: false,
      error: "Top level error: " + String(topLevelError)
    };
  }
}