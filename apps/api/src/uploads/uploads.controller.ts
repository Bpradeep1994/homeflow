import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { AuthGuard } from '../auth/auth.guard';

/**
 * Local-disk file storage (./uploads, served at /uploads/*).
 * This is the seam for Cloudflare R2 / S3: swap diskStorage for a cloud
 * uploader and return the bucket URL — the API shape stays the same.
 */
@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.mimetype)),
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Attach a png/jpg/webp/pdf as "file" (max 5 MB)');
    return { url: `/uploads/${file.filename}`, size: file.size, mimeType: file.mimetype };
  }
}
