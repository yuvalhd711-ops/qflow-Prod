import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('[Reset Counters] Starting daily queue counter reset...');
    
    // Get all queues and reset in parallel
    const allQueues = await base44.asServiceRole.entities.Queue.list();
    console.log(`[Reset Counters] Found ${allQueues.length} queues`);
    
    // Reset all queues in parallel
    await Promise.all(
      allQueues.map(queue => 
        base44.asServiceRole.entities.Queue.update(queue.id, { seq_counter: 0 })
      )
    );
    console.log(`[Reset Counters] Successfully reset ${allQueues.length} queue counters`);
    
    // Get active tickets with limit and batch cancel
    console.log('[Reset Counters] Cancelling active tickets...');
    const batchSize = 50;
    let totalCancelled = 0;
    
    for (const state of ['waiting', 'called', 'in_service']) {
      let hasMore = true;
      while (hasMore) {
        const tickets = await base44.asServiceRole.entities.Ticket.filter(
          { state },
          undefined,
          batchSize
        );
        
        if (tickets.length === 0) {
          hasMore = false;
        } else {
          await Promise.all(
            tickets.map(ticket => 
              base44.asServiceRole.entities.Ticket.update(ticket.id, { state: 'cancelled' })
            )
          );
          totalCancelled += tickets.length;
          hasMore = tickets.length === batchSize;
        }
      }
    }
    
    console.log(`[Reset Counters] Successfully cancelled ${totalCancelled} active tickets`);
    
    return Response.json({ 
      success: true, 
      message: `Reset ${resetCount} queue counters and cancelled all active tickets`,
      queuesReset: resetCount,
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