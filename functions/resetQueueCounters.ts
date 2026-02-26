import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('[Reset Counters] Starting daily queue counter reset...');
    
    // Get all queues and reset in batches
    const allQueues = await base44.asServiceRole.entities.Queue.list();
    console.log(`[Reset Counters] Found ${allQueues.length} queues`);
    
    // Reset queues in batches of 10
    const queueBatchSize = 10;
    for (let i = 0; i < allQueues.length; i += queueBatchSize) {
      const batch = allQueues.slice(i, i + queueBatchSize);
      await Promise.all(
        batch.map(queue => 
          base44.asServiceRole.entities.Queue.update(queue.id, { seq_counter: 0 })
        )
      );
    }
    console.log(`[Reset Counters] Successfully reset ${allQueues.length} queue counters`);
    
    // Cancel tickets in smaller batches
    console.log('[Reset Counters] Cancelling active tickets...');
    let totalCancelled = 0;
    const ticketBatchSize = 10; // Process 10 at a time for speed
    
    for (const state of ['waiting', 'called', 'in_service']) {
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const tickets = await base44.asServiceRole.entities.Ticket.filter(
          { state },
          undefined,
          100 // Fetch 100 but process in smaller batches
        );
        
        if (tickets.length === 0) {
          hasMore = false;
        } else {
          // Process in micro-batches of 10
          for (let i = 0; i < tickets.length; i += ticketBatchSize) {
            const batch = tickets.slice(i, i + ticketBatchSize);
            await Promise.all(
              batch.map(ticket => 
                base44.asServiceRole.entities.Ticket.update(ticket.id, { state: 'cancelled' })
              )
            );
            totalCancelled += batch.length;
          }
          hasMore = tickets.length === 100;
        }
      }
    }
    
    console.log(`[Reset Counters] Successfully cancelled ${totalCancelled} active tickets`);
    
    return Response.json({ 
      success: true, 
      message: `Reset ${allQueues.length} queue counters and cancelled ${totalCancelled} active tickets`,
      queuesReset: allQueues.length,
      ticketsCancelled: totalCancelled,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Reset Counters] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});