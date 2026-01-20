'use strict';
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'google-credentials.json');
const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const DISC_SCOPES = ['https://www.googleapis.com/auth/drive'];


function getAuthClient(scopes) {
  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes,
  });
}
// --- Google Sheets ---
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || ' Translation-Bureau';


async function appendToDisc(file){
  const auth = getAuthClient(DISC_SCOPES);
  const service = google.drive({ version: 'v3', auth });
  const FOLDER_ID = '1l-2KxRNugs0HKLGGdOci-63mRxxjzf6u';
  const requestBody = {
    name: file.filename,
    fields: 'id',
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: 'image/jpeg',
    body: fs.createReadStream(`uploads/${file.filename}`),
  };

  const fileData = await service.files.create({
    requestBody,
    media,
  });

  console.log('Successfully appended to disc', fileData.data.id);
};


async function appendToSheet(applicationData) {
  if (!SPREADSHEET_ID) {
    console.warn('SPREADSHEET_ID is not set. Skipping sheet append.');
    return;
  }
  console.log('[GoogleSheets] Attempting to append data:', applicationData);

  const auth = getAuthClient(SHEETS_SCOPES);
  const sheets = google.sheets({ version: 'v4', auth });
  const rowValues = [
    new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }),
    applicationData.name,
    applicationData.email,
    applicationData.telephone,
  ];

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowValues],
      },
    });
    console.log('Data appended successfully:', response.data.updates.updatedRange);
  } catch (err) {
    console.error('[GoogleSheets] Error appending data to sheet:', err.message);
  }
};

module.exports = {
  appendToSheet,
  appendToDisc
};
