Deno.serve(async (req) => {
  try {
    const { ticket_number } = await req.json();

    if (!ticket_number) {
      return Response.json({ error: 'ticket_number is required' }, { status: 400 });
    }

    // Generate audio file using Google Translate TTS
    const hebrewText = `מספר ${ticket_number}`;
    const encodedText = encodeURIComponent(hebrewText);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=he&client=tw-ob&q=${encodedText}`;

    console.log('Fetching audio from:', ttsUrl);

    // Download the audio
    const audioResponse = await fetch(ttsUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to generate audio from TTS service');
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return Response.json({ 
      audio_url: dataUrl,
      ticket_number: String(ticket_number).padStart(3, '0')
    });

  } catch (error) {
    console.error('Error in getTicketAudio:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});