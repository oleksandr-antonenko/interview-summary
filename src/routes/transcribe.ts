import { FastifyInstance } from 'fastify';
import { transcribeAudio } from '../services/deepgram.js';
import { identifySpeakers, generateSummary } from '../services/gemini.js';
import { generateTextFile } from '../services/rtf.js';

const ALLOWED_MIMETYPES = [
  // MP3
  'audio/mpeg',
  'audio/mp3',
  'audio/mpeg3',
  'audio/x-mpeg-3',
  // WAV
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/vnd.wave',
  // WebM
  'audio/webm',
  // OGG
  'audio/ogg',
  'audio/vorbis',
  'audio/opus',
  // AAC / M4A
  'audio/aac',
  'audio/aacp',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4a-latm',
  // FLAC
  'audio/flac',
  'audio/x-flac',
  // AIFF
  'audio/aiff',
  'audio/x-aiff',
  // AMR
  'audio/amr',
  'audio/amr-wb',
  // WMA
  'audio/x-ms-wma',
  'audio/wma',
  'audio/x-wma',
  // Basic/other
  'audio/basic',
  'audio/L16',
  'audio/L24',
  // Fallback for any audio type
  'application/octet-stream',
];

export async function transcribeRoutes(fastify: FastifyInstance) {
  fastify.post('/api/transcribe', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      const parts = request.parts();
      const audioFiles: { filename: string; buffer: Buffer; mimetype: string }[] = [];
      let language = 'en';

      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'language') {
          language = part.value as string;
        } else if (part.type === 'file' && part.fieldname === 'audio') {
          const mimetype = part.mimetype;

          const isAllowed = mimetype.startsWith('audio/') || ALLOWED_MIMETYPES.includes(mimetype);
          if (!isAllowed) {
            reply.status(400);
            return {
              success: false,
              error: `Unsupported format: ${mimetype}. Please upload an audio file.`,
            };
          }

          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }

          audioFiles.push({
            filename: part.filename,
            buffer: Buffer.concat(chunks),
            mimetype,
          });
        }
      }

      if (audioFiles.length === 0) {
        reply.status(400);
        return { success: false, error: 'No audio files provided' };
      }

      try {
        const transcriptions: string[] = [];

        for (const file of audioFiles) {
          fastify.log.info(`Transcribing: ${file.filename} (language: ${language})`);
          const transcript = await transcribeAudio(file.buffer, file.mimetype, language);
          transcriptions.push(transcript);
        }

        const combinedTranscription = transcriptions.join('\n\n---\n\n');

        fastify.log.info('Identifying speakers...');
        const transcriptionWithSpeakers = await identifySpeakers(combinedTranscription, language);

        fastify.log.info(`Generating summary in ${language}...`);
        const summary = await generateSummary(transcriptionWithSpeakers, language);

        fastify.log.info('Generating text document...');
        const textBuffer = generateTextFile(summary, transcriptionWithSpeakers);

        reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', 'attachment; filename="interview-transcription.txt"');

        return textBuffer;
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed',
        };
      }
    },
  });
}
