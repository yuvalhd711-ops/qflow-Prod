import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { audioData, fileName } = await req.json();

    if (!audioData || !fileName) {
      return Response.json({ error: 'audioData and fileName are required' }, { status: 400 });
    }

    // Convert array back to Uint8Array
    const audioBytes = new Uint8Array(audioData);
    
    // Create blob
    const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
    
    // Upload using Base44 integration
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: blob
    });

    return Response.json({ file_url });

  } catch (error) {
    console.error('Error in uploadAudioFile:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});