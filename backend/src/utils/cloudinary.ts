import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
export const uploadImage = async (buffer: Buffer, options: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: options.folder || 'socialvibe',
        transformation: options.transformation || [
          { width: 1080, height: 1080, crop: 'limit', quality: 'auto' }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// Upload video to Cloudinary
export const uploadVideo = async (buffer: Buffer, options: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: options.folder || 'socialvibe/videos',
        transformation: options.transformation || [
          { width: 720, height: 1280, crop: 'limit', quality: 'auto' }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// Generate video thumbnail
export const generateVideoThumbnail = (publicId: string): string => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 400, height: 400, crop: 'fill' },
      { quality: 'auto' }
    ]
  });
};

// Delete media from Cloudinary
export const deleteMedia = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting media from Cloudinary:', error);
    throw error;
  }
};

// Upload profile avatar
export const uploadAvatar = async (buffer: Buffer): Promise<any> => {
  return uploadImage(buffer, {
    folder: 'socialvibe/avatars',
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' },
      { quality: 'auto', format: 'auto' }
    ]
  });
};

// Upload story media
export const uploadStoryMedia = async (buffer: Buffer, type: 'image' | 'video'): Promise<any> => {
  const options = {
    folder: 'socialvibe/stories',
    transformation: type === 'image' 
      ? [{ width: 720, height: 1280, crop: 'fill' }, { quality: 'auto' }]
      : [{ width: 720, height: 1280, crop: 'limit' }, { quality: 'auto' }]
  };

  if (type === 'video') {
    return uploadVideo(buffer, options);
  } else {
    return uploadImage(buffer, options);
  }
};

// Upload post media
export const uploadPostMedia = async (buffer: Buffer, type: 'image' | 'video'): Promise<any> => {
  const options = {
    folder: 'socialvibe/posts',
    transformation: type === 'image' 
      ? [{ width: 1080, height: 1080, crop: 'limit' }, { quality: 'auto' }]
      : [{ width: 1080, height: 1080, crop: 'limit' }, { quality: 'auto' }]
  };

  if (type === 'video') {
    return uploadVideo(buffer, options);
  } else {
    return uploadImage(buffer, options);
  }
};

// Upload reel video
export const uploadReelVideo = async (buffer: Buffer): Promise<any> => {
  return uploadVideo(buffer, {
    folder: 'socialvibe/reels',
    transformation: [
      { width: 720, height: 1280, crop: 'limit' },
      { quality: 'auto' }
    ],
    eager: [
      { width: 400, height: 400, crop: 'fill', format: 'jpg' } // Generate thumbnail
    ]
  });
};

export default cloudinary;