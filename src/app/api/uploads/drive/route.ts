import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getGooglePrivateKey(): string {
  const raw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (!raw) {
    throw new Error('Missing GOOGLE_DRIVE_PRIVATE_KEY');
  }
  return raw.replace(/\\n/g, '\n');
}

async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  if (!serviceAccountEmail) {
    throw new Error('Missing GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL');
  }

  const privateKey = getGooglePrivateKey();
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, 'base64url');

  const assertion = `${unsignedToken}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.text();
    throw new Error(`Google token request failed: ${tokenError}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token as string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json({ error: 'Your account is banned' }, { status: 403 });
  }

  const userRole = profile?.role || 'viewer';
  if (!['contributor', 'editor', 'moderator', 'admin'].includes(userRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: 'Missing GOOGLE_DRIVE_FOLDER_ID' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, and WEBP files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds 2MB limit' },
        { status: 400 }
      );
    }

    const accessToken = await getGoogleAccessToken();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;

    const metadata = {
      name: safeName,
      parents: [folderId],
      mimeType: file.type,
    };

    const boundary = `drive-upload-${crypto.randomUUID()}`;
    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`
    );
    const ending = Buffer.from(`\r\n--${boundary}--`);
    const multipartBody = Buffer.concat([preamble, fileBuffer, ending]);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      throw new Error(`Google Drive upload failed: ${uploadError}`);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id as string;

    // Try to make the file publicly readable for map/detail display.
    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    if (!permissionResponse.ok) {
      const permissionError = await permissionResponse.text();
      console.warn('Drive permission update failed:', permissionError);
    }

    return NextResponse.json({
      fileId,
      imageUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
      viewUrl: uploadData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    });
  } catch (error) {
    console.error('Drive upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
