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
    
    // Cancel all active tickets (waiting, called, in_service)
    const activeTickets = await base44.asServiceRole.entities.Ticket.filter({
      state: 'waiting'
    });
    const calledTickets = await base44.asServiceRole.entities.Ticket.filter({
      state: 'called'
    });
    const inServiceTickets = await base44.asServiceRole.entities.Ticket.filter({
      state: 'in_service'
    });
    
    const allActiveTickets = [...activeTickets, ...calledTickets, ...inServiceTickets];
    console.log(`[Reset Counters] Found ${allActiveTickets.length} active tickets to cancel`);
    
    // Cancel tickets in parallel using Promise.all for better performance
    if (allActiveTickets.length > 0) {
      await Promise.all(
        allActiveTickets.map(ticket => 
          base44.asServiceRole.entities.Ticket.update(ticket.id, { state: 'cancelled' })
        )
      );
      console.log(`[Reset Counters] Successfully cancelled ${allActiveTickets.length} active tickets`);
    }
    
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