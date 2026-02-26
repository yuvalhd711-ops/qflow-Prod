import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('[Reset Counters] Starting daily queue counter reset...');
    
    // Get all queues
    const allQueues = await base44.asServiceRole.entities.Queue.list();
    console.log(`[Reset Counters] Found ${allQueues.length} queues`);
    
    // Reset seq_counter for each queue
    let resetCount = 0;
    for (const queue of allQueues) {
      await base44.asServiceRole.entities.Queue.update(queue.id, {
        seq_counter: 0
      });
      resetCount++;
      console.log(`[Reset Counters] Reset queue: ${queue.name} (${queue.id})`);
    }
    
    console.log(`[Reset Counters] Successfully reset ${resetCount} queue counters`);
    
    // Cancel all active tickets (waiting, called, in_service) using bulk update
    console.log(`[Reset Counters] Cancelling all active tickets...`);
    
    await base44.asServiceRole.entities.Ticket.bulkUpdate(
      { state: { $in: ['waiting', 'called', 'in_service'] } },
      { state: 'cancelled' }
    );
    
    console.log(`[Reset Counters] Successfully cancelled all active tickets`);
    
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