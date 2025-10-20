import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ImagesRequest {
  Body: {
    runId: string;
  };
}

interface ImageUploadRequest {
  Body: {
    runId: string;
    page: string;
    imageData: string; // base64 encoded image
    filename: string;
    altText?: string;
    title?: string;
  };
}

interface Image {
  id: string;
  url: string;
  alt_text: string;
  title: string;
  page: string;
  type: string;
  width?: string;
  height?: string;
  uploaded_at: string;
  is_uploaded: boolean;
  filename?: string;
}

export async function imagesRoute(fastify: FastifyInstance) {
  fastify.post<ImagesRequest>('/images', async (request, reply) => {
    const { runId } = request.body;
    
    try {
      // Read the extracted image data from the run directory
      const imagesFilePath = join(process.cwd(), '..', '..', 'runs', runId, 'images', 'manifest.json');
      
      fastify.log.info(`Looking for images file at: ${imagesFilePath}`);
      
      if (!existsSync(imagesFilePath)) {
        fastify.log.warn(`Images file not found: ${imagesFilePath}`);
        reply.code(404);
        return {
          status: 'error',
          message: 'No image data found for this run',
          runId,
          debug: {
            imagesFilePath,
            cwd: process.cwd()
          }
        };
      }
      
      const imagesData = JSON.parse(readFileSync(imagesFilePath, 'utf8'));
      
      // Convert the extracted data to the format expected by the frontend
      const images: Image[] = imagesData.map((item: any, index: number) => ({
        id: item.id || `image_${index}`,
        url: item.url || '',
        alt_text: item.alt_text || '',
        title: item.title || '',
        page: item.page || 'Home Page',
        type: item.type || 'content',
        width: item.width,
        height: item.height,
        uploaded_at: item.uploaded_at || new Date().toISOString(),
        is_uploaded: item.is_uploaded || false,
        filename: item.filename
      }));
      
      return {
        status: 'success',
        message: 'Image extraction completed',
        runId,
        images,
        count: images.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Image extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // New endpoint for uploading images
  fastify.post<ImageUploadRequest>('/images/upload', async (request, reply) => {
    const { runId, page, imageData, filename, altText, title } = request.body;
    
    try {
      const imagesDir = join(process.cwd(), '..', '..', 'runs', runId, 'images');
      const manifestPath = join(imagesDir, 'manifest.json');
      
      // Ensure images directory exists
      if (!existsSync(imagesDir)) {
        fastify.log.error(`Images directory not found: ${imagesDir}`);
        reply.code(404);
        return {
          status: 'error',
          message: 'Run directory not found',
          runId
        };
      }
      
      // Read existing images
      let existingImages: any[] = [];
      if (existsSync(manifestPath)) {
        existingImages = JSON.parse(readFileSync(manifestPath, 'utf8'));
      }
      
      // Generate unique ID for the uploaded image
      const imageId = `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save the image file
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const imagePath = join(imagesDir, `${imageId}_${filename}`);
      writeFileSync(imagePath, imageBuffer);
      
      // Create image entry
      const newImage = {
        id: imageId,
        url: `/runs/${runId}/images/${imageId}_${filename}`,
        alt_text: altText || '',
        title: title || '',
        page: page,
        type: 'uploaded',
        uploaded_at: new Date().toISOString(),
        is_uploaded: true,
        filename: filename,
        local_path: imagePath
      };
      
      // Add to existing images
      existingImages.push(newImage);
      
      // Save updated manifest
      writeFileSync(manifestPath, JSON.stringify(existingImages, null, 2));
      
      return {
        status: 'success',
        message: 'Image uploaded successfully',
        runId,
        image: newImage
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Image upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
