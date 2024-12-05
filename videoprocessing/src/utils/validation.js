import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

// Common video formats that are well-supported by ffmpeg
export const SUPPORTED_INPUT_FORMATS = [
  // Container formats
  '.mp4',  // MPEG-4 Part 14
  '.mov',  // QuickTime Movie
  '.avi',  // Audio Video Interleave
  '.mkv',  // Matroska Video
  '.wmv',  // Windows Media Video
  '.flv',  // Flash Video
  '.webm', // WebM
  '.m4v',  // MPEG-4 Video
  '.ts',   // MPEG Transport Stream
  '.mts',  // AVCHD Video
];

// Common video codecs that we can reliably transcode
export const SUPPORTED_VIDEO_CODECS = [
  'h264',      // AVC/H.264
  'hevc',      // H.265/HEVC
  'mpeg4',     // MPEG-4 Part 2
  'mpeg2video', // MPEG-2
  'vp8',       // VP8
  'vp9',       // VP9
  'av1'        // AV1
];

export function isVideoFormatSupported(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return SUPPORTED_INPUT_FORMATS.includes(ext);
}

export async function validateVideoFile(filepath) {
  if (!isVideoFormatSupported(filepath)) {
    throw new Error(`Unsupported file format. Supported formats are: ${SUPPORTED_INPUT_FORMATS.join(', ')}`);
  }

  try {
    const metadata = await getVideoMetadata(filepath);
    
    if (!metadata.codec) {
      throw new Error('Could not detect video codec');
    }

    if (!SUPPORTED_VIDEO_CODECS.includes(metadata.codec.toLowerCase())) {
      throw new Error(`Unsupported video codec: ${metadata.codec}. Supported codecs are: ${SUPPORTED_VIDEO_CODECS.join(', ')}`);
    }

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid video dimensions');
    }

    if (!metadata.duration || metadata.duration <= 0) {
      throw new Error('Invalid video duration');
    }

    return {
      isValid: true,
      metadata
    };
  } catch (error) {
    throw new Error(`Video validation failed: ${error.message}`);
  }
}

export async function getVideoMetadata(filepath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
      }
      resolve({
        duration: metadata.format.duration,
        width: videoStream.width,
        height: videoStream.height,
        bitrate: parseInt(videoStream.bit_rate) || parseInt(metadata.format.bit_rate),
        fps: eval(videoStream.r_frame_rate),
        codec: videoStream.codec_name
      });
    });
  });
}