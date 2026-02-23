import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Starting to generate 100 audio files...');
    const results = [];
    const errors = [];

    // Generate audio files for numbers 1-100
    for (let i = 1; i <= 100; i++) {
      try {
        console.log(`Generating audio for number ${i}...`);
        
        const ticketNum = String(i).padStart(3, '0');
        const fileName = `ticket_${ticketNum}.mp3`;

        // Check if file already exists
        try {
          const existingFiles = await base44.asServiceRole.storage.listFiles();
          const fileExists = existingFiles.some(f => f.name === fileName);

          if (fileExists) {
            console.log(`File ${fileName} already exists, skipping`);
            results.push({ number: i, status: 'exists', fileName });
            continue;
          }
        } catch (err) {
          console.log(`File ${fileName} does not exist, creating...`);
        }

        // Generate audio using Google Translate TTS
        const hebrewText = `מספר ${i}`;
        const encodedText = encodeURIComponent(hebrewText);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=he&client=tw-ob&q=${encodedText}`;

        // Download the audio
        const audioResponse = await fetch(ttsUrl);
        if (!audioResponse.ok) {
          throw new Error(`TTS service failed for number ${i}`);
        }

        const audioBlob = await audioResponse.blob();
        const audioArrayBuffer = await audioBlob.arrayBuffer();
        const audioFile = new Uint8Array(audioArrayBuffer);

        // Upload to storage
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
          file: audioFile
        });

        results.push({ 
          number: i, 
          status: 'created', 
          fileName,
          url: file_url 
        });
        
        console.log(`✓ Created audio for number ${i}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error generating audio for number ${i}:`, error);
        errors.push({ number: i, error: error.message });
      }
    }

    console.log('Finished generating audio files');

    return Response.json({
      success: true,
      total: 100,
      created: results.filter(r => r.status === 'created').length,
      existing: results.filter(r => r.status === 'exists').length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Error in generateInitialAudio:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});