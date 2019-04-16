import GoogleSpreadsheet from 'google-spreadsheet';
import creds from '../../canary-creds.js';

const instantiateDoc:GoogleSpreadsheet = async (id:string) => {
  const doc = new GoogleSpreadsheet(id);
  await authenticate(doc);
  return doc;
}

export const appendRow = async (data) => {
  try {
    const doc = await instantiateDoc(process.env.SHEET_ID);
    await doc.addRow(1, data, (err) => { if(err) console.error(err) });
  } catch(e) {
    console.error(`Error appending row ${e}`);
    return;
  }
}

const authenticate = async (doc: GoogleSpreadsheet) => {
  return new Promise((resolve, reject) => {
    doc.useServiceAccountAuth(creds, (err) => {
      if(err) reject(err);
      else resolve();
    });
  });
}
