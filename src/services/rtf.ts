export function generateTextFile(summary: string, transcription: string): Buffer {
  const title = 'Interview Transcription Report';
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const separator = '='.repeat(60);

  const content = `${title}
Generated on ${date}

${separator}
SUMMARY
${separator}

${summary}

${separator}
FULL TRANSCRIPTION
${separator}

${transcription}
`;

  return Buffer.from(content, 'utf-8');
}
