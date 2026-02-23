import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticket_number } = await req.json();

    if (!ticket_number) {
      return Response.json({ error: 'ticket_number is required' }, { status: 400 });
    }

    // Normalize ticket number to 3 digits (e.g., 24 -> "024")
    const ticketNum = String(ticket_number).padStart(3, '0');
    const fileName = `ticket_${ticketNum}.mp3`;

    // Check if audio file already exists
    try {
      const existingFiles = await base44.asServiceRole.storage.listFiles();
      const fileExists = existingFiles.some(f => f.name === fileName);

      if (fileExists) {
        // Return existing file URL
        const fileUrl = await base44.asServiceRole.storage.getPublicUrl(fileName);
        return Response.json({ audio_url: fileUrl });
      }
    } catch (err) {
      console.log('File does not exist yet, will create:', err);
    }

    // Generate audio file using Google Translate TTS
    const hebrewText = `מספר ${ticket_number}`;
    const encodedText = encodeURIComponent(hebrewText);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=he&client=tw-ob&q=${encodedText}`;

    // Download the audio
    const audioResponse = await fetch(ttsUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to generate audio from TTS service');
    }

    const audioBlob = await audioResponse.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioFile = new Uint8Array(audioArrayBuffer);

    // Upload to storage
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: audioFile
    });

    return Response.json({ 
      audio_url: file_url,
      ticket_number: ticketNum
    });

  } catch (error) {
    console.error('Error in getTicketAudio:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});