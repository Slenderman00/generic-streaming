import ffmpeg from 'fluent-ffmpeg';
import { ASPECT_RATIOS, BITRATE_RANGES } from '../config/constants.js';

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
        codec: videoStream.codec_name,
        pixelFormat: videoStream.pix_fmt,
        profile: videoStream.profile
      });
    });
  });
}

export function calculateOptimalResolutions(metadata) {
  const { width, height } = metadata;
  const aspectRatio = width / height;
  const sourceResolution = height;
  const resolutions = [];

  let standardRatio = '16:9';
  let minDiff = Infinity;
  
  // Find closest standard aspect ratio
  for (const [ratio, value] of Object.entries(ASPECT_RATIOS)) {
    const diff = Math.abs(value - aspectRatio);
    if (diff < minDiff) {
      minDiff = diff;
      standardRatio = ratio;
    }
  }

  // Add source resolution first
  const sourceWidth = Math.round(sourceResolution * aspectRatio / 2) * 2;
  resolutions.push({
    height: sourceResolution,
    width: sourceWidth,
    name: `${sourceResolution}p`
  });

  // Add all lower resolutions
  const possibleHeights = [2160, 1440, 1080, 720, 480, 360];
  for (const targetHeight of possibleHeights) {
    if (targetHeight >= sourceResolution) continue;

    const targetWidth = Math.round(targetHeight * aspectRatio / 2) * 2;
    if (targetWidth > 3840) continue;

    resolutions.push({
      height: targetHeight,
      width: targetWidth,
      name: `${targetHeight}p`
    });
  }

  return resolutions;
}

export function calculateOptimalBitrate(resolution, metadata) {
  const resolutionName = `${resolution.height}p`;
  const range = BITRATE_RANGES[resolutionName];
  
  if (!range) {
    const standardHeights = Object.keys(BITRATE_RANGES).map(r => parseInt(r));
    const closestHeight = standardHeights.reduce((prev, curr) => {
      return Math.abs(curr - resolution.height) < Math.abs(prev - resolution.height) ? curr : prev;
    });
    const closestRange = BITRATE_RANGES[`${closestHeight}p`];
    return Math.round((closestRange.min + closestRange.max) / 2);
  }

  const pixelCount = resolution.width * resolution.height;
  const sourcePixelCount = metadata.width * metadata.height;
  const scaleFactor = pixelCount / sourcePixelCount;
  
  let baseBitrate = (range.min + range.max) / 2;

  if (metadata.fps > 30) {
    baseBitrate *= 1.5;
  }

  const scaledSourceBitrate = (metadata.bitrate / 1000) * scaleFactor;
  baseBitrate = Math.min(baseBitrate, scaledSourceBitrate * 1.2);
  baseBitrate = Math.max(range.min, Math.min(range.max, baseBitrate));
  
  return Math.round(baseBitrate);
}
  