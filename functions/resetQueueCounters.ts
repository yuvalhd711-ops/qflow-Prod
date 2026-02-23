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
    
    return Response.json({ 
      success: true, 
      message: `Reset ${resetCount} queue counters`,
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