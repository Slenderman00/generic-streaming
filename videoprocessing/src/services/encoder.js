import { PrismaClient } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { calculateOptimalBitrate } from "../utils/video.js";

export class VideoEncoder {
    constructor(videoId, logger) {
      this.videoId = videoId;
      this.logger = logger;
      this.prisma = new PrismaClient();
      this.activeProcesses = new Map();
    }

    getOptimalEncodingSettings(metadata, resolution) {
      const pixFmt = metadata.pixelFormat?.toLowerCase() || 'yuv420p';
      const inputProfile = metadata.profile?.toLowerCase() || 'high';
      
      // Base settings
      let outputProfile = 'high';
      let outputPixFmt = 'yuv420p';
      
      // Adjust settings based on input format and resolution
      if (pixFmt.includes('444') || inputProfile.includes('444')) {
        outputProfile = resolution.height >= 1080 ? 'high444' : 'high';
        outputPixFmt = resolution.height >= 1080 ? 'yuv444p' : 'yuv420p';
      } else if (pixFmt.includes('422') || inputProfile.includes('422')) {
        outputProfile = resolution.height >= 1080 ? 'high422' : 'high';
        outputPixFmt = resolution.height >= 1080 ? 'yuv422p' : 'yuv420p';
      }

      // Force yuv420p for lower resolutions for better compatibility
      if (resolution.height < 1080) {
        outputPixFmt = 'yuv420p';
        outputProfile = 'main';
      }

      return { profile: outputProfile, pixFmt: outputPixFmt };
    }

    calculateThreads(resolution) {
      // Allocate threads based on resolution
      if (resolution.height >= 2160) return 4;      // 4K
      if (resolution.height >= 1440) return 3;      // 2K
      if (resolution.height >= 1080) return 2;      // 1080p
      return 1;                                     // Lower resolutions
    }

    getEncodingPreset(resolution) {
      // Balance quality and speed based on resolution
      if (resolution.height >= 2160) return 'slow';        // Best quality for 4K
      if (resolution.height >= 1440) return 'medium';      // Good quality for 2K
      if (resolution.height >= 1080) return 'fast';        // Balanced for 1080p
      return 'veryfast';                                   // Speed for lower res
    }

    async killProcess(resolutionName) {
      const process = this.activeProcesses.get(resolutionName);
      if (process) {
        try {
          process.kill('SIGKILL');
          this.activeProcesses.delete(resolutionName);
          console.log(`Killed process for resolution: ${resolutionName}`);
        } catch (error) {
          console.error(`Error killing process for ${resolutionName}:`, error);
        }
      }
    }

    async transcodeToResolution(inputPath, outputPath, resolution, metadata) {
      return new Promise((resolve, reject) => {
        let lastProgress = 0;
        let progressComplete = false;
        const bitrate = calculateOptimalBitrate(resolution, metadata);
        const { profile, pixFmt } = this.getOptimalEncodingSettings(metadata, resolution);
        const threads = this.calculateThreads(resolution);
        const preset = this.getEncodingPreset(resolution);

        // Calculate timeouts based on resolution
        const maxProcessingTime = resolution.height >= 1080 ? 
          30 * 60 * 1000 :  // 30 minutes for HD+
          20 * 60 * 1000;   // 20 minutes for lower resolutions

        let processTimeout;

        const cleanup = async () => {
          if (processTimeout) {
            clearTimeout(processTimeout);
          }
          
          await this.killProcess(resolution.name);

          // Ensure 100% progress is set if encoding was successful
          if (!progressComplete && lastProgress > 90) {
            await this.updateEncodingProgress(resolution.name, 100);
            await this.logger.logProgress(resolution.name, 100);
            progressComplete = true;
          }
        };

        console.log('Starting transcode with settings:', {
          resolution: resolution.name,
          width: resolution.width,
          height: resolution.height,
          bitrate,
          profile,
          pixFmt,
          threads,
          preset
        });
        
        const command = ffmpeg()
          .input(inputPath)
          .outputOptions([
            // Video settings
            '-c:v', 'libx264',
            '-profile:v', profile,
            '-pix_fmt', pixFmt,
            '-preset', preset,
            '-threads', threads,
            
            // Bitrate control
            '-b:v', `${bitrate}k`,
            '-maxrate', `${bitrate * 1.5}k`,
            '-bufsize', `${bitrate * 2}k`,
            
            // Audio settings
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',
            '-ar', '48000',
            
            // General settings
            '-movflags', '+faststart',
            '-y'
          ])
          .videoFilters([
            {
              filter: 'scale',
              options: {
                w: resolution.width,
                h: resolution.height,
                force_original_aspect_ratio: 'decrease',
                flags: 'lanczos'
              }
            },
            {
              filter: 'pad',
              options: {
                w: resolution.width,
                h: resolution.height,
                x: '(ow-iw)/2',
                y: '(oh-ih)/2'
              }
            }
          ])
          .on('start', (cmdline) => {
            console.log(`Starting encode for ${resolution.name} with command:`, cmdline);
            this.activeProcesses.set(resolution.name, command);
            
            processTimeout = setTimeout(async () => {
              const error = new Error(`Encoding timed out after ${maxProcessingTime/60000} minutes`);
              await cleanup();
              reject(error);
            }, maxProcessingTime);
          })
          .on('progress', async (progress) => {
            // Cap progress at 95% during encoding
            const currentProgress = Math.min(95, Math.floor(progress.percent));
            if (currentProgress > lastProgress) {
              await this.updateEncodingProgress(resolution.name, currentProgress);
              await this.logger.logProgress(resolution.name, currentProgress);
              lastProgress = currentProgress;
            }
          })
          .on('error', async (err, stdout, stderr) => {
            await cleanup();
            console.error(`Encoding error for ${resolution.name}:`, {
              message: err.message,
              stdout,
              stderr
            });
            reject(err);
          })
          .on('end', async () => {
            try {
              const stats = await fs.stat(outputPath);
              if (stats.size === 0) {
                await cleanup();
                reject(new Error('Output file is empty'));
              } else {
                // Set progress to 100% only after successful encoding
                await this.updateEncodingProgress(resolution.name, 100);
                await this.logger.logProgress(resolution.name, 100);
                progressComplete = true;
                await cleanup();
                resolve(outputPath);
              }
            } catch (err) {
              await cleanup();
              reject(new Error(`Failed to verify output file: ${err.message}`));
            }
          });

        // Verify input file before starting
        fs.access(inputPath, fs.constants.R_OK)
          .then(() => fs.stat(inputPath))
          .then(stats => {
            if (stats.size === 0) {
              throw new Error('Input file is empty');
            }
            command.save(outputPath);
          })
          .catch(async err => {
            await cleanup();
            reject(new Error(`Input file error: ${err.message}`));
          });
      });
    }

    async updateEncodingProgress(resolutionName, progress) {
      try {
        await this.prisma.encodingProgress.upsert({
          where: {
            videoId_resolution: {
              videoId: this.videoId,
              resolution: resolutionName
            }
          },
          update: { progress },
          create: {
            videoId: this.videoId,
            resolution: resolutionName,
            progress
          }
        });
      } catch (error) {
        await this.logger.logError(error, resolutionName);
      }
    }

    async storeEncodedVideo(resolution, filepath, metadata) {
      try {
        const stats = await fs.stat(filepath);
        await this.prisma.encodedVideo.create({
          data: {
            videoId: this.videoId,
            resolution: resolution.name,
            filepath: filepath,
            filesize: stats.size,
            width: resolution.width,
            height: resolution.height,
            bitrate: calculateOptimalBitrate(resolution, metadata)
          }
        });
      } catch (error) {
        await this.logger.logError(error, resolution.name);
        throw error;
      }
    }

    async cleanup() {
      // Kill all active processes
      for (const [resolutionName] of this.activeProcesses) {
        await this.killProcess(resolutionName);
      }
    }
}