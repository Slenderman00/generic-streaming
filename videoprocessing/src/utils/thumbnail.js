import { dirname, basename } from 'path';
import ffmpeg from 'fluent-ffmpeg';

async function generateThumbnail(inputPath, outputPath, timestamp = '00:00:02') {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: basename(outputPath),
        folder: dirname(outputPath),
        size: '1280x720'
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
}

export { generateThumbnail };