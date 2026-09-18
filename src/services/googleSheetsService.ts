import { WorkflowItem } from '../types';

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_WORKSHEET_NAME = 'Untitled Worksheet';

const APP_SPREADSHEET_NAME = 'LogCrafter - Workflow Database';

/**
 * Safely formats an A1 notation range for Google Sheets API.
 * Sheet names with spaces or special characters MUST be wrapped in single quotes, e.g.:
 * 'Untitled Worksheet'!A1:K1
 */
export function formatA1Range(sheetName: string, range?: string): string {
  const safeSheetName = `'${(sheetName || DEFAULT_WORKSHEET_NAME).replace(/'/g, "''")}'`;
  return range ? `${safeSheetName}!${range}` : safeSheetName;
}

/**
 * Searches user's Google Drive for an existing spreadsheet created for this app.
 */
export async function findExistingSpreadsheet(accessToken: string): Promise<GoogleSpreadsheetInfo | null> {
  try {
    const query = encodeURIComponent(
      `(name contains 'LogCrafter' or name contains 'Workflow' or name = '${APP_SPREADSHEET_NAME}' or name = 'Dynamic Workflow - Automation') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn('Could not search Google Drive files:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        id: file.id,
        name: file.name,
        url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding existing spreadsheet in Google Drive:', error);
    return null;
  }
}

/**
 * Computes standard user signature filename, e.g. "username-signature.png".
 */
export function getUserSignatureFileName(email?: string, name?: string): string {
  let base = 'user';
  if (email && email.includes('@')) {
    base = email.split('@')[0].trim().toLowerCase();
  } else if (name) {
    base = name.trim().toLowerCase().replace(/\s+/g, '_');
  }
  base = base.replace(/[^a-z0-9_-]/gi, '');
  return `${base || 'user'}-signature.png`;
}

/**
 * Parses a base64 Data URL into Uint8Array binary and MIME type.
 */
export function parseDataUrl(dataUrl: string): { uint8Array: Uint8Array; mimeType: string } {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const byteString = atob(parts[1] || '');
  const uint8Array = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return { uint8Array, mimeType };
}

/**
 * Searches user's Google Drive for an existing signature file matching filename.
 */
export async function findSignatureFileInDrive(
  accessToken: string,
  fileName: string
): Promise<{ id: string; name: string } | null> {
  try {
    const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (err) {
    console.warn('Could not search for existing signature file:', err);
    return null;
  }
}

/**
 * Uploads or updates a signature (drawn or uploaded) to the user's Google Drive as ${username}-signature.png.
 * Sets permission so Google Sheets =IMAGE(...) formula can render it.
 * Returns fileId and public direct image CDN URL.
 */
export async function uploadOrUpdateSignatureInDrive(
  accessToken: string,
  dataUrl: string,
  email?: string,
  name?: string
): Promise<{ fileId: string; viewUrl: string } | null> {
  try {
    const fileName = getUserSignatureFileName(email, name);
    const { uint8Array, mimeType } = parseDataUrl(dataUrl);

    const existing = await findSignatureFileInDrive(accessToken, fileName);
    let fileId: string | null = null;

    if (existing) {
      // Update existing file media
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': mimeType,
          },
          body: uint8Array,
        }
      );
      if (updateRes.ok) {
        fileId = existing.id;
      }
    }

    if (!fileId) {
      // Create new file with standard multipart/related upload
      const boundary = '-------' + Math.random().toString(36).substring(2);
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: mimeType,
      };

      const metadataHeader = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
      const mediaHeader = `Content-Type: ${mimeType}\r\n\r\n`;

      const multipartBlob = new Blob(
        [
          delimiter,
          metadataHeader,
          delimiter,
          mediaHeader,
          uint8Array,
          closeDelim,
        ],
        { type: `multipart/related; boundary=${boundary}` }
      );

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBlob,
        }
      );

      if (createRes.ok) {
        const createData = await createRes.json();
        fileId = createData.id;
      }
    }

    if (!fileId) {
      console.warn('Failed to upload/update signature in Google Drive');
      return null;
    }

    // Set permission so Google Sheets =IMAGE(...) formula can render it
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
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
    } catch (pErr) {
      console.warn('Could not set permissions on signature file in Drive:', pErr);
    }

    const viewUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    try {
      localStorage.setItem('workflow_user_signature_url', viewUrl);
      localStorage.setItem('workflow_user_signature_file_id', fileId);
    } catch {
      // ignore
    }

    return { fileId, viewUrl };
  } catch (err) {
    console.error('Error syncing signature to Google Drive:', err);
    return null;
  }
}

/**
 * Restores user's signature from Google Drive when logging in or on page load.
 */
export async function fetchUserSignatureFromDrive(
  accessToken: string,
  email?: string,
  name?: string
): Promise<{ dataUrl: string; viewUrl: string; fileId: string } | null> {
  try {
    const fileName = getUserSignatureFileName(email, name);
    const existing = await findSignatureFileInDrive(accessToken, fileName);
    if (!existing) return null;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const viewUrl = `https://lh3.googleusercontent.com/d/${existing.id}`;
        resolve({ dataUrl, viewUrl, fileId: existing.id });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not fetch signature from Google Drive:', err);
    return null;
  }
}

/**
 * Resolves the Google Sheets cell representation for a signature.
 * If signature exists, returns '=IMAGE("...")' using the Google Drive image URL.
 */
export async function resolveSignatureCell(
  accessToken: string,
  signature?: string,
  userInfo?: { email?: string; name?: string }
): Promise<string> {
  if (!signature) return '❌ No Signature';

  // 1. Check if cached Drive view URL is available
  let cdnUrl = localStorage.getItem('workflow_user_signature_url') || '';

  // 2. If signature is a base64 Data URL, upload or update in Google Drive
  if (signature.startsWith('data:image/')) {
    try {
      const uploadRes = await uploadOrUpdateSignatureInDrive(
        accessToken,
        signature,
        userInfo?.email,
        userInfo?.name
      );
      if (uploadRes?.viewUrl) {
        cdnUrl = uploadRes.viewUrl;
      }
    } catch (e) {
      console.warn('Could not sync signature to Drive during row insertion:', e);
    }
  }

  // 3. If Drive URL exists, embed directly into the cell using =IMAGE(...)
  if (cdnUrl) {
    return `=IMAGE("${cdnUrl}")`;
  }

  return '✔️ Signed';
}


/**
 * Creates a brand new Google Spreadsheet in the user's personal Google Drive
 * with formatted headers.
 */
export async function createPersonalSpreadsheet(
  accessToken: string,
  initialSheets: string[] = [DEFAULT_WORKSHEET_NAME]
): Promise<GoogleSpreadsheetInfo> {
  const sheetsPayload = initialSheets.map(title => ({
    properties: { title },
  }));

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: APP_SPREADSHEET_NAME,
      },
      sheets: sheetsPayload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create Google Spreadsheet: ${errorData.error?.message || response.statusText}`
    );
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const webViewLink = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize header rows in the sheets
  for (const sheetName of initialSheets) {
    await initSheetHeaders(accessToken, spreadsheetId, sheetName);
  }

  return {
    id: spreadsheetId,
    name: APP_SPREADSHEET_NAME,
    url: webViewLink,
  };
}

/**
 * Writes the standard column headers into a worksheet if it is empty.
 */
export async function initSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  try {
    const headers = [
      [
        'Record ID',
        'Date',
        'Work Hours (hrs)',
        'Work 1 (Mandatory)',
        'Work 2',
        'Work 3',
        'Work 4',
        'Due Hours (hrs)',
        'Signature',
        'Worksheet',
        'Submitted At',
      ],
    ];

    // 1. Write Header Row values
    const headerRange = formatA1Range(sheetName, 'A1:K1');
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: headers }),
      }
    );

    // 2. Fetch numeric sheetId for styling batchUpdate
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === sheetName
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return;
    const sheetId = sheetObj.properties.sheetId;

    // 3. Apply header styling, column alignments, comfortable widths, and freeze row 1
    const columnWidthRequests = [
      { index: 0, width: 130 }, // Record ID
      { index: 1, width: 115 }, // Date
      { index: 2, width: 135 }, // Work Hours (hrs)
      { index: 3, width: 260 }, // Work 1 (Mandatory)
      { index: 4, width: 210 }, // Work 2
      { index: 5, width: 210 }, // Work 3
      { index: 6, width: 210 }, // Work 4
      { index: 7, width: 135 }, // Due Hours (hrs)
      { index: 8, width: 140 }, // Signature
      { index: 9, width: 140 }, // Worksheet
      { index: 10, width: 170 }, // Submitted At
    ].map(col => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: col.index,
          endIndex: col.index + 1,
        },
        properties: {
          pixelSize: col.width,
        },
        fields: 'pixelSize',
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // A. Header Row Styling (Row 0): Bold, White text, Navy Background, Centered
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 11,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 30 / 255,
                      green: 41 / 255,
                      blue: 59 / 255,
                    },
                    textFormat: {
                      bold: true,
                      fontSize: 10,
                      foregroundColor: {
                        red: 1,
                        green: 1,
                        blue: 1,
                      },
                    },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
              },
            },
            // B. Freeze Row 1 so it stays fixed while scrolling
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            // C. Task Columns (Work 1 to 4): Left aligned with text wrapping
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 3,
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'LEFT',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy)',
              },
            },
            // D. Center alignment for Record ID, Date, Work Hours
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 3,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
            // E. Center alignment for Due Hours, Signature, Worksheet, Submitted At
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 7,
                  endColumnIndex: 11,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
            // F. Set comfortable initial widths
            ...columnWidthRequests,
            // G. Auto-resize all columns based on content
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 11,
                },
              },
            },
          ],
        }),
      }
    );
  } catch (err) {
    console.warn(`Could not initialize headers for sheet ${sheetName}:`, err);
  }
}

/**
 * Creates a new sheet tab in the existing Google Spreadsheet and adds headers.
 */
export async function createWorksheetTab(
  accessToken: string,
  spreadsheetId: string,
  title: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title,
                },
              },
            },
          ],
        }),
      }
    );

    if (res.ok) {
      await initSheetHeaders(accessToken, spreadsheetId, title);
    }
    return res.ok;
  } catch (err) {
    console.error('Error adding sheet tab to Google Sheets:', err);
    return false;
  }
}

/**
 * Renames an existing worksheet tab inside the user's Google Spreadsheet.
 */
export async function renameWorksheetTab(
  accessToken: string,
  spreadsheetId: string,
  oldTitle: string,
  newTitle: string
): Promise<boolean> {
  try {
    // 1. Fetch spreadsheet metadata to find the numeric sheetId for oldTitle
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === oldTitle
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;

    const sheetId = sheetObj.properties.sheetId;

    // 2. batchUpdate to rename sheet title
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  title: newTitle,
                },
                fields: 'title',
              },
            },
          ],
        }),
      }
    );

    return updateRes.ok;
  } catch (err) {
    console.error('Error renaming worksheet in Google Sheets:', err);
    return false;
  }
}

/**
 * Deletes a worksheet tab from the user's Google Spreadsheet.
 */
export async function deleteWorksheetTab(
  accessToken: string,
  spreadsheetId: string,
  title: string
): Promise<boolean> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === title
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;

    const sheetId = sheetObj.properties.sheetId;

    const delRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              deleteSheet: {
                sheetId,
              },
            },
          ],
        }),
      }
    );
    return delRes.ok;
  } catch (err) {
    console.error('Error deleting sheet tab from Google Sheets:', err);
    return false;
  }
}

/**
 * Appends a workflow record row directly into the user's personal Google Sheet.
 */
export async function appendWorkflowRowToSheet(
  accessToken: string,
  spreadsheetId: string,
  item: WorkflowItem,
  userInfo?: { email?: string; name?: string }
): Promise<boolean> {
  try {
    const sheetName = item.sheetName || DEFAULT_WORKSHEET_NAME;

    // Convert workHours and dueHours to pure numbers so Google Sheets can automatically calculate SUM and Average upon selection
    const parsedWorkHours = parseFloat(String(item.workHours || '0')) || 0;
    const parsedDueHours = parseFloat(String(item.workDueHours || '0')) || 0;

    const signatureCell = await resolveSignatureCell(accessToken, item.signature, userInfo);

    const row = [
      item.id,
      item.date,
      parsedWorkHours,
      item.work1 || '',
      item.work2 || '',
      item.work3 || '',
      item.work4 || '',
      parsedDueHours,
      signatureCell,
      sheetName,
      item.submittedAt || new Date().toLocaleString(),
    ];

    const rangeA1 = formatA1Range(sheetName, 'A1');
    let response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    // If tab doesn't exist yet, automatically create the tab and retry
    if (!response.ok && response.status === 400) {
      console.warn(`Tab '${sheetName}' might not exist. Creating tab and retrying append...`);
      const created = await createWorksheetTab(accessToken, spreadsheetId, sheetName);
      if (created) {
        response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [row],
            }),
          }
        );
      }
    }

    if (response.ok) {
      // Auto-fit column widths and ensure alignment asynchronously in the background
      triggerAutoResizeAndFormatting(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return response.ok;
  } catch (err) {
    console.error('Failed to append row to user Google Sheet:', err);
    return false;
  }
}

/**
 * Bulk appends workflow items grouped by worksheet tab into the Google Sheet.
 * Used for initial sync when a connected Google Sheet is empty.
 */
export async function batchAppendWorkflowRowsToSheet(
  accessToken: string,
  spreadsheetId: string,
  items: WorkflowItem[],
  userInfo?: { email?: string; name?: string }
): Promise<boolean> {
  if (!items || items.length === 0) return true;

  try {
    // 1. Group items by sheetName
    const grouped: Record<string, WorkflowItem[]> = {};
    for (const item of items) {
      const s = item.sheetName || DEFAULT_WORKSHEET_NAME;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    }

    // 2. Fetch existing tabs to see if we need to create any
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const existingTabs = new Set<string>();
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      (metaData.sheets || []).forEach((sh: { properties?: { title?: string } }) => {
        if (sh.properties?.title) existingTabs.add(sh.properties.title);
      });
    }

    // 3. For each sheet group, ensure tab exists and append rows
    for (const [sheetName, sheetItems] of Object.entries(grouped)) {
      if (!existingTabs.has(sheetName)) {
        await createWorksheetTab(accessToken, spreadsheetId, sheetName);
        existingTabs.add(sheetName);
      }

      const rows: (string | number)[][] = [];
      for (const item of sheetItems) {
        const signatureCell = await resolveSignatureCell(accessToken, item.signature, userInfo);
        rows.push([
          item.id,
          item.date,
          parseFloat(String(item.workHours || '0')) || 0,
          item.work1 || '',
          item.work2 || '',
          item.work3 || '',
          item.work4 || '',
          parseFloat(String(item.workDueHours || '0')) || 0,
          signatureCell,
          sheetName,
          item.submittedAt || new Date().toLocaleString(),
        ]);
      }

      const rangeA1 = formatA1Range(sheetName, 'A1');
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );

      triggerAutoResizeAndFormatting(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('Failed to batch append rows to Google Sheet:', err);
    return false;
  }
}

/**
 * Asynchronously auto-resizes columns and applies clean alignments to the sheet.
 */
async function triggerAutoResizeAndFormatting(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === sheetName
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return;
    const sheetId = sheetObj.properties.sheetId;

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // 1. Auto-resize all 11 columns to fit their content
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 11,
                },
              },
            },
            // Explicit width for Signature column
            {
              updateDimensionProperties: {
                range: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 8,
                  endIndex: 9,
                },
                properties: {
                  pixelSize: 140,
                },
                fields: 'pixelSize',
              },
            },
            // Comfortable row height for data rows so =IMAGE(...) signatures look clear
            {
              updateDimensionProperties: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: 1,
                  endIndex: 200,
                },
                properties: {
                  pixelSize: 42,
                },
                fields: 'pixelSize',
              },
            },
            // 2. Align task description columns (Work 1, Work 2, Work 3, Work 4) to the LEFT with wrap
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 3,
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'LEFT',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy)',
              },
            },
            // 3. Align Date, Work Hours to CENTER
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 3,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
            // 4. Align Due Hours, Signature, Worksheet, Submitted At to CENTER
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 7,
                  endColumnIndex: 11,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
          ],
        }),
      }
    );
  } catch (err) {
    console.warn('Could not auto-resize/format sheet columns:', err);
  }
}

/**
 * Updates an existing row in the user's Google Spreadsheet matching item.id (stored in column A).
 */
export async function updateWorkflowRowInSheet(
  accessToken: string,
  spreadsheetId: string,
  item: WorkflowItem,
  userInfo?: { email?: string; name?: string }
): Promise<boolean> {
  try {
    const sheetName = item.sheetName || DEFAULT_WORKSHEET_NAME;

    // 1. Fetch column A (Record IDs) to find the exact row number
    const rangeColA = formatA1Range(sheetName, 'A:A');
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeColA)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!getRes.ok) return false;
    const getData = await getRes.json();
    const rows = getData.values as string[][] | undefined;
    if (!rows || rows.length === 0) return false;

    // Find the row index where column A matches item.id
    const rowIndex = rows.findIndex(r => r && r[0] === item.id);
    if (rowIndex === -1) {
      console.warn(`Could not find row with ID ${item.id} in sheet ${sheetName}`);
      return false;
    }
    const rowNumber = rowIndex + 1; // 1-indexed for Sheets

    const parsedWorkHours = parseFloat(String(item.workHours || '0')) || 0;
    const parsedDueHours = parseFloat(String(item.workDueHours || '0')) || 0;
    const signatureCell = await resolveSignatureCell(accessToken, item.signature, userInfo);

    const row = [
      item.id,
      item.date,
      parsedWorkHours,
      item.work1 || '',
      item.work2 || '',
      item.work3 || '',
      item.work4 || '',
      parsedDueHours,
      signatureCell,
      sheetName,
      item.submittedAt || new Date().toLocaleString(),
    ];

    // 2. Overwrite the specific row range A{rowNumber}:K{rowNumber}
    const rowRange = formatA1Range(sheetName, `A${rowNumber}:K${rowNumber}`);
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    if (updateRes.ok) {
      triggerAutoResizeAndFormatting(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return updateRes.ok;
  } catch (err) {
    console.error('Failed to update row in Google Sheet:', err);
    return false;
  }
}

/**
 * Deletes a row from the user's Google Spreadsheet matching itemId (stored in column A).
 */
export async function deleteWorkflowRowFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  itemId: string
): Promise<boolean> {
  try {
    // 1. Fetch spreadsheet metadata to get numeric sheetId
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === sheetName
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;
    const sheetId = sheetObj.properties.sheetId;

    // 2. Fetch Column A to find the 0-indexed row index
    const rangeColA = formatA1Range(sheetName, 'A:A');
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeColA)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!getRes.ok) return false;
    const getData = await getRes.json();
    const rows = getData.values as string[][] | undefined;
    if (!rows || rows.length === 0) return false;

    const rowIndex = rows.findIndex(r => r && r[0] === itemId);
    if (rowIndex === -1) return false;

    // 3. Delete the specific row using deleteDimension batchUpdate
    const delRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        }),
      }
    );

    return delRes.ok;
  } catch (err) {
    console.error('Failed to delete row from Google Sheet:', err);
    return false;
  }
}

/**
 * Clears all data rows in a worksheet tab while preserving the header row.
 */
export async function clearWorksheetRowsInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    const rangeClear = formatA1Range(sheetName, 'A2:K');
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeClear)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.ok;
  } catch (err) {
    console.error('Failed to clear worksheet data in Google Sheet:', err);
    return false;
  }
}

/**
 * Loads all worksheet tabs and their workflow entries directly from Google Sheets.
 */
export async function fetchSpreadsheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{ worksheets: string[]; items: WorkflowItem[] } | null> {
  try {
    // 1. Fetch all sheet tab names
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();
    const sheetTitles = (metaData.sheets || [])
      .map((s: { properties?: { title?: string } }) => s.properties?.title)
      .filter(Boolean) as string[];

    if (sheetTitles.length === 0) return null;

    // 2. Fetch rows for all sheets via batchGet using safe single-quoted ranges
    const queryRanges = sheetTitles
      .map(t => `ranges=${encodeURIComponent(formatA1Range(t, 'A2:K'))}`)
      .join('&');

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryRanges}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!batchRes.ok) {
      console.warn('Could not batchGet sheet data:', batchRes.statusText);
      return { worksheets: sheetTitles, items: [] };
    }
    const batchData = await batchRes.json();

    const loadedItems: WorkflowItem[] = [];

    (batchData.valueRanges || []).forEach((vr: { range?: string; values?: (string | number)[][] }, idx: number) => {
      const sheetName = sheetTitles[idx] || DEFAULT_WORKSHEET_NAME;
      const rows = vr.values || [];

      rows.forEach((r, rowIdx) => {
        if (!r || r.length === 0 || !r[1]) return; // Skip empty rows or rows without date
        // Skip header rows if present
        if (String(r[0]).toLowerCase().includes('record') || String(r[1]).toLowerCase() === 'date') return;

        // Normalize date to YYYY-MM-DD
        let rawDate = String(r[1] || '').trim();
        const slashMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
          const [, m, day, y] = slashMatch;
          rawDate = `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        loadedItems.push({
          id: String(r[0] || `item_${Date.now()}_${idx}_${rowIdx}`),
          date: rawDate,
          workHours: String(r[2] ?? '0'),
          work1: String(r[3] || ''),
          work2: String(r[4] || ''),
          work3: String(r[5] || ''),
          work4: String(r[6] || ''),
          workDueHours: String(r[7] ?? '0'),
          signature:
            r[8] &&
            (String(r[8]).includes('Signed') ||
              String(r[8]).includes('=IMAGE') ||
              String(r[8]).includes('googleusercontent') ||
              String(r[8]).includes('drive.google'))
              ? 'attached'
              : '',
          sheetName: sheetName, // Always associate the entry with its containing worksheet tab
          submittedAt: String(r[10] || ''),
        });
      });
    });

    return {
      worksheets: sheetTitles,
      items: loadedItems,
    };
  } catch (err) {
    console.error('Failed to fetch spreadsheet data from Google Sheets:', err);
    return null;
  }
}

