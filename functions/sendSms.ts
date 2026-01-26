export default async function sendSms(context) {
  const { phoneNumber, queueName, ticketSeq, messageOverride, msgId } = context.params;

  // Normalize phone number (remove spaces, dashes, etc.)
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Build default message
  const defaultMessage = `שוק העיר
מחלקת ${queueName}
מספר התור שלך: ${ticketSeq}

אתה כעת יכול להמשיך בקניות בסניף, אנחנו כבר נשלח לך תזכורת כשהתור יתקרב.

להצטרפות למועדון:
https://s1c.me/shukhair_01`;

  const messageText = messageOverride || defaultMessage;

  // Create payload
  const payload = {
    Cli: cleanPhone,
    Text: messageText,
    MsgId: msgId || `ticket_${ticketSeq}_${Date.now()}`
  };

  try {
    // Send to SMS proxy server
    const response = await fetch("http://84.110.65.94:2000/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.SMS_PROXY_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`SMS server responded with status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: "SMS נשלח בהצלחה",
      data: result
    };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return {
      success: false,
      message: "שגיאה בשליחת SMS",
      error: error.message
    };
  }
}