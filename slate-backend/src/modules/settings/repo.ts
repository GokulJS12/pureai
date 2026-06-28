import { getDb } from '../../db/client.js';

export interface Settings {
  screen: string;
  companionOpen: boolean;
  voiceOn: boolean;
  cameraOn: boolean;
  ambient: string | null;
  ambientVol: number;
  mood: string | null;
  activeNoteId: string | null;
  lifeCat: string;
}

function rowTo(r: any): Settings {
  return {
    screen: r.screen,
    companionOpen: !!r.companion_open,
    voiceOn: !!r.voice_on,
    cameraOn: !!r.camera_on,
    ambient: r.ambient ?? null,
    ambientVol: r.ambient_vol,
    mood: r.mood ?? null,
    activeNoteId: r.active_note_id ?? null,
    lifeCat: r.life_cat,
  };
}

/** Ensure a settings row exists, then return it. */
export function getSettings(userId: string): Settings {
  const db = getDb();
  let r = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  if (!r) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
    r = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  }
  return rowTo(r);
}

export interface SettingsPatch {
  screen?: string;
  companionOpen?: boolean;
  voiceOn?: boolean;
  cameraOn?: boolean;
  ambient?: string | null;
  ambientVol?: number;
  mood?: string | null;
  activeNoteId?: string | null;
  lifeCat?: string;
}

export function updateSettings(userId: string, patch: SettingsPatch): Settings {
  const cur = getSettings(userId);
  const next: Settings = {
    screen: patch.screen ?? cur.screen,
    companionOpen: patch.companionOpen ?? cur.companionOpen,
    voiceOn: patch.voiceOn ?? cur.voiceOn,
    cameraOn: patch.cameraOn ?? cur.cameraOn,
    ambient: patch.ambient === undefined ? cur.ambient : patch.ambient,
    ambientVol: patch.ambientVol ?? cur.ambientVol,
    mood: patch.mood === undefined ? cur.mood : patch.mood,
    activeNoteId: patch.activeNoteId === undefined ? cur.activeNoteId : patch.activeNoteId,
    lifeCat: patch.lifeCat ?? cur.lifeCat,
  };
  getDb()
    .prepare(
      `UPDATE user_settings SET
         screen = ?, companion_open = ?, voice_on = ?, camera_on = ?,
         ambient = ?, ambient_vol = ?, mood = ?, active_note_id = ?, life_cat = ?
       WHERE user_id = ?`,
    )
    .run(
      next.screen,
      next.companionOpen ? 1 : 0,
      next.voiceOn ? 1 : 0,
      next.cameraOn ? 1 : 0,
      next.ambient,
      next.ambientVol,
      next.mood,
      next.activeNoteId,
      next.lifeCat,
      userId,
    );
  return next;
}
