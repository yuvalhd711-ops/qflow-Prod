export default async function monitorQueueForSms(context) {
  const { base44 } = context;

  try {
    // Get all active queues
    const allQueues = await base44.asServiceRole.entities.Queue.list();
    const activeQueues = allQueues.filter(q => q.is_active);

    const results = [];

    for (const queue of activeQueues) {
      try {
        // Get all tickets in this queue
        const allTickets = await base44.asServiceRole.entities.Ticket.filter({ 
          queue_id: queue.id 
        });

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
          targetTicket = waitingTickets[1]; // 2nd waiting
        } else {
          targetTicket = waitingTickets[2]; // 3rd waiting
        }

        // Check if we should send notification
        if (!targetTicket || 
            !targetTicket.customer_phone || 
            targetTicket.two_before_sms_sent) {
          continue;
        }

        // Send SMS
        const smsResult = await base44.functions.invoke('sendSms', {
          phoneNumber: targetTicket.customer_phone,
          queueName: queue.name,
          ticketSeq: targetTicket.ticket_number,
          messageOverride: "כמעט הגענו אליך... יש עוד 2 לקוחות בתור לפניך. כדאי להתחיל להתקדם לכיוון הדלפק",
          msgId: `monitor_${targetTicket.id}`
        });

        if (smsResult.success) {
          // Mark as sent
          await base44.asServiceRole.entities.Ticket.update(targetTicket.id, {
            two_before_sms_sent: true
          });

          results.push({
            queue: queue.name,
            ticket: targetTicket.ticket_number,
            status: "sent"
          });
        }
      } catch (error) {
        console.error(`Error processing queue ${queue.id}:`, error);
        results.push({
          queue: queue.name,
          status: "error",
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `סרוקו ${activeQueues.length} תורים`,
      results: results,
      sentCount: results.filter(r => r.status === "sent").length
    };
  } catch (error) {
    console.error("Error in monitorQueueForSms:", error);
    return {
      success: false,
      message: "שגיאה בניטור תורים",
      error: error.message
    };
  }
}