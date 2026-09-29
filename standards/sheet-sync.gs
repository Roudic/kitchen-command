/**
 * Hueytown Standards Board  <->  Google Sheet sync
 *
 * Paste this whole file into the Sheet: Extensions > Apps Script.
 * 1. Change KEY below to any long word only you know (letters and numbers).
 * 2. Deploy > New deployment > type "Web app"
 *      Execute as: Me   ·   Who has access: Anyone
 *    Copy the Web app URL.
 * 3. On the board, tap "Sheet sync", paste the URL and the same KEY, Save.
 *
 * The board writes every change here. Rows you add or edit in the Sheet
 * show up on the board at its next sync (about every 2 minutes, or "Sync now").
 * Delete tasks on the board, not in the Sheet.
 */
const KEY = 'CHANGE-ME';

const COLS = ['Area', 'Task', 'Priority', 'Owner / Completed by', 'Status', 'Due date', 'Notes / follow-up', 'ID', 'Updated'];
const ID_COL = 8, UPDATED_COL = 9;

function sheet_() { return SpreadsheetApp.getActive().getSheets()[0]; }

function ensureHeader_(s) {
  const h = s.getRange(1, 1, 1, COLS.length).getValues()[0];
  if (h[ID_COL - 1] !== 'ID' || h[UPDATED_COL - 1] !== 'Updated') {
    s.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
}

function rows_(s) {
  const n = s.getLastRow();
  if (n < 2) return [];
  return s.getRange(2, 1, n - 1, COLS.length).getValues().map((r, i) => ({ row: i + 2, r }));
}

function day_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '').trim();
}

function toTask_(r) {
  return {
    area: String(r[0] || '').trim(), task: String(r[1] || '').trim(), priority: String(r[2] || '').trim(),
    owner: String(r[3] || '').trim(), status: String(r[4] || '').trim(), due: day_(r[5]),
    notes: String(r[6] || '').trim(), id: String(r[7] || '').trim(),
    updated: r[8] instanceof Date ? r[8].toISOString() : String(r[8] || '')
  };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Board reads the Sheet.
function doGet(e) {
  if (!e || e.parameter.key !== KEY) return json_({ error: 'Wrong key' });
  const s = sheet_();
  ensureHeader_(s);
  return json_({ rows: rows_(s).map(x => toTask_(x.r)).filter(t => t.task) });
}

// Board writes to the Sheet: {key, ops:[{type:'upsert'|'delete', id, task, matchTask}]}
function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  if (body.key !== KEY) return json_({ error: 'Wrong key' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = sheet_();
    ensureHeader_(s);
    const all = rows_(s);
    (body.ops || []).forEach(op => {
      let hit = all.find(x => String(x.r[ID_COL - 1]) === op.id);
      if (!hit && op.matchTask) hit = all.find(x => !x.r[ID_COL - 1] && String(x.r[1]).trim() === op.matchTask);
      if (op.type === 'delete') {
        if (!hit) return;
        s.deleteRow(hit.row);
        all.splice(all.indexOf(hit), 1);
        all.forEach(x => { if (x.row > hit.row) x.row--; });
        return;
      }
      const t = op.task || {};
      const vals = [t.area, t.task, t.priority, t.owner || '', t.status, t.due || '', t.notes || '', op.id, new Date()];
      if (hit) { s.getRange(hit.row, 1, 1, COLS.length).setValues([vals]); hit.r = vals; }
      else { s.appendRow(vals); all.push({ row: s.getLastRow(), r: vals }); }
    });
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Stamps "Updated" when someone edits a task by hand, so the board takes the newer version.
function onEdit(e) {
  const r = e.range;
  if (r.getRow() < 2 || r.getColumn() > 7) return;
  r.getSheet().getRange(r.getRow(), UPDATED_COL, r.getNumRows(), 1).setValue(new Date());
}
