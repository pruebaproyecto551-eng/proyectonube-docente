import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';

const configured =
  Boolean(env.google.clientId) && Boolean(env.google.clientSecret) && Boolean(env.google.redirectUri);

export const googleConfigured = configured;

export const oauth2Client = configured
  ? new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    )
  : null;

const scopes = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
];

const TOKENS_PATH = path.resolve(__dirname, '../../../google_tokens.json');

function getStoredTokens(): Record<string, any> {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
    }
    // Fallback: leer desde variable de entorno (Railway / producción en la nube)
    if (process.env.GOOGLE_TOKENS_B64) {
      return JSON.parse(Buffer.from(process.env.GOOGLE_TOKENS_B64, 'base64').toString('utf-8'));
    }
  } catch (_) {}
  return {};
}

function saveStoredTokens(tokens: Record<string, any>) {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  } catch (_) {}
}

export const userGoogleTokens: Record<string, any> = getStoredTokens();

export async function getGoogleAuthUrl(): Promise<string> {
  if (!oauth2Client) {
    throw Object.assign(new Error('Google OAuth is not configured'), { status: 503 });
  }
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
}

export async function getGoogleUser(code: string) {
  if (!oauth2Client) {
    throw Object.assign(new Error('Google OAuth is not configured'), { status: 503 });
  }
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email;
  if (!email) {
    throw new Error('Google account email not available');
  }

  const realName = profile.data.name || [profile.data.given_name, profile.data.family_name].filter(Boolean).join(' ') || email;

  // Guardar tokens de forma persistente en disco
  const allTokens = getStoredTokens();
  allTokens[email.toLowerCase()] = tokens;
  allTokens['pruebaproyecto551@gmail.com'] = tokens; // vincular cuenta demo también
  saveStoredTokens(allTokens);

  return {
    providerId: profile.data.id ?? email,
    email,
    name: realName,
    picture: profile.data.picture,
    tokens,
  };
}

export async function createRealDriveFolder(userEmail: string, courseName: string, folderName: string) {
  const allTokens = getStoredTokens();
  const tokens = allTokens[userEmail.toLowerCase()] || allTokens['pruebaproyecto551@gmail.com'] || allTokens['pameleivagomez@gmail.com'];
  if (!tokens || !env.google.clientId) {
    console.log('[Google Drive] No hay tokens guardados para:', userEmail);
    return null;
  }

  try {
    const auth = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
    auth.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    // 1. Buscar o crear carpeta principal "2026 - CINDEA Inglés"
    console.log('[Google Drive] Buscando o creando carpeta raíz "2026 - CINDEA Inglés"...');
    const rootRes = await drive.files.list({
      q: "name = '2026 - CINDEA Inglés' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name, webViewLink)',
    });

    let rootId = rootRes.data.files?.[0]?.id;
    if (!rootId) {
      const createdRoot = await drive.files.create({
        requestBody: {
          name: '2026 - CINDEA Inglés',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id, webViewLink',
      });
      rootId = createdRoot.data.id ?? undefined;
      console.log('[Google Drive] Carpeta raíz creada con ID:', rootId);
    }

    // 2. Buscar o crear subcarpeta del Nivel / Curso (ej. "Inglés 10° Año", "Inglés 11° Año", etc.)
    const cleanCourseName = courseName.replace(/[\/\\:*?"<>|]/g, '-').trim();
    console.log(`[Google Drive] Buscando o creando carpeta de nivel: "${cleanCourseName}"...`);
    const levelRes = await drive.files.list({
      q: `name = '${cleanCourseName}' and '${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
    });

    let levelId = levelRes.data.files?.[0]?.id;
    if (!levelId) {
      const createdLevel = await drive.files.create({
        requestBody: {
          name: cleanCourseName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: rootId ? [rootId] : undefined,
        },
        fields: 'id, webViewLink',
      });
      levelId = createdLevel.data.id ?? undefined;
      console.log('[Google Drive] Carpeta de nivel creada con ID:', levelId);
    }

    // 3. Buscar si ya existe la subcarpeta de la Tarea dentro del Nivel
    const cleanFolderName = folderName.replace(/[\/\\:*?"<>|]/g, '-').trim();
    let taskFolderId: string | undefined;
    let taskWebViewLink: string | undefined;

    if (levelId) {
      const searchTask = await drive.files.list({
        q: `name = '${cleanFolderName}' and mimeType = 'application/vnd.google-apps.folder' and '${levelId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink)',
      });
      if (searchTask.data.files && searchTask.data.files.length > 0) {
        taskFolderId = searchTask.data.files[0].id ?? undefined;
        taskWebViewLink = searchTask.data.files[0].webViewLink ?? undefined;
        console.log(`[Google Drive] Carpeta de tarea existente encontrada: "${cleanFolderName}" (ID: ${taskFolderId})`);
      }
    }

    if (!taskFolderId) {
      console.log(`[Google Drive] Creando carpeta de tarea: "${cleanFolderName}" dentro de nivel "${cleanCourseName}"...`);
      const createdTaskFolder = await drive.files.create({
        requestBody: {
          name: cleanFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: levelId ? [levelId] : (rootId ? [rootId] : undefined),
        },
        fields: 'id, webViewLink',
      });
      taskFolderId = createdTaskFolder.data.id ?? undefined;
      taskWebViewLink = createdTaskFolder.data.webViewLink ?? undefined;
      console.log('[Google Drive] Carpeta de tarea creada:', cleanFolderName, taskWebViewLink);
    }

    return {
      folderId: taskFolderId,
      webViewLink: taskWebViewLink,
      levelFolderId: levelId,
      rootFolderId: rootId,
    };
  } catch (err: any) {
    console.warn('[Google Drive API] Error al crear jerarquía en Google Drive:', err.message);
    return null;
  }
}

export async function deleteFilesFromDrive(
  courseName: string,
  taskTitle: string,
  fileNames: string[]
) {
  const allTokens = getStoredTokens();
  const tokens = allTokens['pruebaproyecto551@gmail.com'] || Object.values(allTokens)[0];
  if (!tokens || !env.google.clientId || !fileNames || fileNames.length === 0) return;

  try {
    const auth = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
    auth.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const folderInfo = await createRealDriveFolder('pruebaproyecto551@gmail.com', courseName, taskTitle);
    const parentFolderId = folderInfo?.folderId;
    if (!parentFolderId) return;

    for (const name of fileNames) {
      if (!name) continue;
      const cleanName = name.replace(/[\/\\:*?"<>|]/g, '_').trim();
      const q = `name = '${cleanName}' and '${parentFolderId}' in parents and trashed = false`;
      const searchRes = await drive.files.list({ q, fields: 'files(id, name)' });
      if (searchRes.data.files && searchRes.data.files.length > 0) {
        for (const file of searchRes.data.files) {
          if (file.id) {
            console.log(`[Google Drive] 🗑️ Eliminando archivo anterior en Drive: "${file.name}" (ID: ${file.id})...`);
            await drive.files.delete({ fileId: file.id }).catch((err) => {
              console.warn('[Google Drive] No se pudo eliminar archivo:', err.message);
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Google Drive] Error al eliminar archivos de Drive:', err.message);
  }
}

export async function uploadFileToDrive(
  courseName: string,
  taskTitle: string,
  fileName: string,
  fileBuffer?: Buffer | string,
  oldFileName?: string | string[]
) {
  const allTokens = getStoredTokens();
  const tokens = allTokens['pruebaproyecto551@gmail.com'] || Object.values(allTokens)[0];
  if (!tokens || !env.google.clientId) return null;

  try {
    const auth = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
    auth.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    // 1. Asegurar que las carpetas existen y obtener el ID exacto
    const folderInfo = await createRealDriveFolder('pruebaproyecto551@gmail.com', courseName, taskTitle);
    const parentFolderId = folderInfo?.folderId;
    if (!parentFolderId) {
      console.warn('[Google Drive] No se pudo obtener la carpeta destino para subir archivo');
      return null;
    }

    const cleanFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_').trim();

    // 2. Si es un reemplazo de archivo o ya existe un archivo con el mismo nombre en la carpeta de Drive, eliminarlo
    try {
      const namesToDelete: string[] = [cleanFileName];
      if (oldFileName) {
        const oldList = Array.isArray(oldFileName) ? oldFileName : [oldFileName];
        for (const old of oldList) {
          if (old) namesToDelete.push(old.replace(/[\/\\:*?"<>|]/g, '_').trim());
        }
      }

      for (const targetName of Array.from(new Set(namesToDelete))) {
        const q = `name = '${targetName}' and '${parentFolderId}' in parents and trashed = false`;
        const existingFiles = await drive.files.list({ q, fields: 'files(id, name)' });
        if (existingFiles.data.files && existingFiles.data.files.length > 0) {
          for (const oldFile of existingFiles.data.files) {
            if (oldFile.id) {
              console.log(`[Google Drive] 🗑️ Eliminando archivo anterior reemplazado en Drive: "${oldFile.name}" (ID: ${oldFile.id})...`);
              await drive.files.delete({ fileId: oldFile.id }).catch((delErr) => {
                console.warn('[Google Drive] No se pudo eliminar archivo anterior:', delErr.message);
              });
            }
          }
        }
      }
    } catch (cleanErr: any) {
      console.warn('[Google Drive] Advertencia al buscar archivos anteriores:', cleanErr.message);
    }

    // 3. Procesar el contenido del nuevo archivo (Base64 o texto)
    let bodyBuffer: Buffer;
    
    if (typeof fileBuffer === 'string') {
      if (fileBuffer.startsWith('data:') && fileBuffer.includes(';base64,')) {
        const base64Data = fileBuffer.split(';base64,')[1];
        bodyBuffer = Buffer.from(base64Data, 'base64');
      } else {
        bodyBuffer = Buffer.from(fileBuffer, 'utf-8');
      }
    } else if (Buffer.isBuffer(fileBuffer)) {
      bodyBuffer = fileBuffer;
    } else {
      bodyBuffer = Buffer.from(`CINDEA MEP 2026 - Entrega de Estudiante\n\nArchivo: ${cleanFileName}\nCurso: ${courseName}\nTarea: ${taskTitle}\nFecha: ${new Date().toLocaleString('es-CR')}\n\n[Contenido verificado en Cloud]`, 'utf-8');
    }

    const { Readable } = await import('stream');
    const mediaStream = new Readable();
    mediaStream.push(bodyBuffer);
    mediaStream.push(null);

    const ext = cleanFileName.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'pdf' ? 'application/pdf'
      : (ext === 'doc' || ext === 'docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : (ext === 'mp3' || ext === 'm4a' || ext === 'wav' || ext === 'ogg') ? 'audio/mpeg'
      : (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
      : 'text/plain';

    console.log(`[Google Drive] Subiendo nuevo archivo "${cleanFileName}" (${bodyBuffer.length} bytes) a la carpeta (${parentFolderId})...`);

    const uploaded = await drive.files.create({
      requestBody: {
        name: cleanFileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType,
        body: mediaStream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    console.log(`[Google Drive] ✅ Archivo "${cleanFileName}" subido exitosamente: ${uploaded.data.webViewLink}`);
    return {
      fileId: uploaded.data.id,
      fileName: uploaded.data.name,
      webViewLink: uploaded.data.webViewLink,
    };
  } catch (err: any) {
    console.warn('[Google Drive] Error al subir archivo a Drive:', err.message);
    return null;
  }
}

export async function listRealCalendarEvents(userEmail: string) {
  const allTokens = getStoredTokens();
  const tokens =
    allTokens[userEmail.toLowerCase()] ||
    allTokens['pruebaproyecto551@gmail.com'] ||
    allTokens['pameleivagomez@gmail.com'];
  if (!tokens || !env.google.clientId) {
    return [];
  }
  try {
    const auth = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
    auth.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (res.data.items || []).map((e) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      htmlLink: e.htmlLink,
    }));
  } catch (err: any) {
    console.warn('[Google Calendar] Error listing events:', err.message);
    return [];
  }
}

export async function createRealCalendarEvent(
  userEmail: string,
  event: { summary: string; description?: string; location?: string; startDateTime: string; endDateTime: string }
) {
  const allTokens = getStoredTokens();
  const tokens =
    allTokens[userEmail.toLowerCase()] ||
    allTokens['pruebaproyecto551@gmail.com'] ||
    allTokens['pameleivagomez@gmail.com'];
  if (!tokens || !env.google.clientId) {
    return null;
  }
  try {
    const auth = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
    auth.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location || 'CINDEA',
        start: {
          dateTime: new Date(event.startDateTime).toISOString(),
          timeZone: 'America/Costa_Rica',
        },
        end: {
          dateTime: new Date(event.endDateTime).toISOString(),
          timeZone: 'America/Costa_Rica',
        },
      },
    });
    return res.data;
  } catch (err: any) {
    console.warn('[Google Calendar] Error creating event:', err.message);
    return null;
  }
}

export async function deleteRealCalendarEvent(userEmail: string, eventId: string) {
  const allTokens = getStoredTokens();
  const tokens =
    allTokens[userEmail.toLowerCase()] ||
    allTokens['pruebaproyecto551@gmail.com'] ||
    allTokens['pameleivagomez@gmail.com'];
  if (!tokens || !env.google.clientId) {
    return false;
  }
  try {
    const auth = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
    auth.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
    return true;
  } catch (err: any) {
    console.warn('[Google Calendar] Error deleting event:', err.message);
    return false;
  }
}



