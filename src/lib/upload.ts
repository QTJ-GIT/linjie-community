import { createClient } from '@/lib/supabase/client';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

function validateImage(file: File): void {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('只支持 PNG / JPEG / WebP / GIF 格式的图片');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('图片大小不能超过 5 MB');
  }
}

function extFromFile(file: File): string {
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase();
  }
  // fallback by mime
  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  if (
    lower.includes('bucket not found') ||
    lower.includes('bucket does not exist') ||
    lower.includes('not_found')
  ) {
    return '请先在 Supabase 运行 0005_storage.sql';
  }
  return msg || '上传失败';
}

/**
 * Uploads an avatar to `avatars/<userId>/<timestamp>-<rand>.<ext>`.
 * Returns the public URL.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  validateImage(file);
  const supabase = createClient();
  const ext = extFromFile(file);
  const path = `${userId}/${Date.now()}-${randomId()}.${ext}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    throw new Error(describeError(error));
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('获取头像链接失败');
  }
  return data.publicUrl;
}

/**
 * Uploads a post image to `post-images/<timestamp>-<rand>.<ext>`.
 * Returns the public URL.
 */
export async function uploadPostImage(file: File): Promise<string> {
  validateImage(file);
  const supabase = createClient();
  const ext = extFromFile(file);
  const path = `${Date.now()}-${randomId()}.${ext}`;

  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
  if (error) {
    throw new Error(describeError(error));
  }

  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('获取图片链接失败');
  }
  return data.publicUrl;
}

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

/**
 * Uploads a teaching video to `teaching-videos/<userId>/<timestamp>-<rand>.<ext>`.
 * Returns the public URL.
 */
export async function uploadTeachingVideo(userId: string, file: File): Promise<string> {
  if (!ALLOWED_VIDEO_MIME.has(file.type)) {
    throw new Error('只支持 MP4 / WebM / OGG / MOV 格式的视频');
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error('视频大小不能超过 500 MB');
  }
  const supabase = createClient();
  const ext = extFromFile(file);
  const path = `${userId}/${Date.now()}-${randomId()}.${ext}`;

  const { error } = await supabase.storage.from('teaching-videos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    throw new Error(describeError(error));
  }

  const { data } = supabase.storage.from('teaching-videos').getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('获取视频链接失败');
  }
  return data.publicUrl;
}
