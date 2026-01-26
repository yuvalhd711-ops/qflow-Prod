export default async function notifyTwoBefore(context) {
  const { queueId } = context.params;
  const { base44 } = context;

  try {
    // Get all tickets in this queue
    const allTickets = await base44.asServiceRole.entities.Ticket.filter({ queue_id: queueId });

    // Get waiting tickets sorted by ticket_number
    const waitingTickets = allTickets
      .filter(t => t.state === "waiting")
      .sort((a, b) => a.ticket_number - b.ticket_number);

    // Get current ticket being served
    const currentTicket = allTickets.find(t => 
      t.state === "called" || t.state === "in_service"
    );

    // Calculate target position
    let targetTicket;
    if (currentTicket) {
      // If someone is being served, notify the 2nd waiting
      targetTicket = waitingTickets[1];
    } else {
      // If no one is being served, notify the 3rd waiting
      targetTicket = waitingTickets[2];
    }

    // Check if we should send notification
    if (!targetTicket) {
      return { success: true, message: "אין כרטיס יעד לתזכורת" };
    }

    if (!targetTicket.customer_phone) {
      return { success: true, message: "אין מספר טלפון לכרטיס היעד" };
    }

    if (targetTicket.two_before_sms_sent) {
      return { success: true, message: "תזכורת כבר נשלחה לכרטיס זה" };
    }

    // Get queue info
    const queue = await base44.asServiceRole.entities.Queue.get(queueId);

    // Send SMS
    const smsResult = await base44.functions.invoke('sendSms', {
      phoneNumber: targetTicket.customer_phone,
      queueName: queue.name,
      ticketSeq: targetTicket.ticket_number,
      messageOverride: "כמעט הגענו אליך... יש עוד 2 לקוחות בתור לפניך. כדאי להתחיל להתקדם לכיוון הדלפק",
      msgId: `twobefore_${targetTicket.id}`
    });

    if (smsResult.success) {
      // Mark as sent
      await base44.asServiceRole.entities.Ticket.update(targetTicket.id, {
        two_before_sms_sent: true
      });

      return {
        success: true,
        message: `תזכורת נשלחה לכרטיס ${targetTicket.ticket_number}`,
        targetTicket: targetTicket.ticket_number
      };
    } else {
      return {
        success: false,
        message: "שגיאה בשליחת SMS",
        error: smsResult.message
      };
    }
  } catch (error) {
    console.error("Error in notifyTwoBefore:", error);
    return {
      success: false,
      message: "שגיאה בפונקציה",
      error: error.message
    };
  }
}