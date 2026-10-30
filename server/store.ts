import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { SessionDocument } from './app';
import type { CulturalEvidence } from './evidence';

export interface Store {
  readSession(hash: string, now: number): Promise<SessionDocument | null>;
  createSession(hash: string, document: SessionDocument, expiresAt: number): Promise<void>;
  compareAndSwap(hash: string, previousVersion: number, document: SessionDocument, expiresAt: number): Promise<boolean>;
  readEvidence(key: string, now: number): Promise<CulturalEvidence | null>;
  writeEvidence(key: string, value: CulturalEvidence, expiresAt: number): Promise<void>;
  acquireLease(key: string, owner: string, now: number, expiresAt: number): Promise<boolean>;
  releaseLease(key: string, owner: string): Promise<void>;
  /** Atomic increment, rejecting values above limit; returns scheduled request time. */
  reserve(key: string, limit: number, now: number, expiresAt: number, intervalMs?: number): Promise<number | null>;
  cleanup(now: number): Promise<void>;
}

/** One local process, durable SQLite data. Production workers use the D1 implementation. */
export class SqliteStore implements Store {
  readonly db: DatabaseSync;
  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  }
  async readSession(hash: string, now: number): Promise<SessionDocument | null> {
    const row = this.db.prepare('SELECT payload FROM sessions WHERE token_hash=? AND expires_at>?').get(hash,now) as {payload:string}|undefined;
    return row ? JSON.parse(row.payload) as SessionDocument : null;
  }
  async createSession(hash: string, document: SessionDocument, expiresAt: number): Promise<void> {
    this.db.prepare('INSERT INTO sessions(token_hash,version,payload,expires_at) VALUES(?,?,?,?)').run(hash,document.state.version,JSON.stringify(document),expiresAt);
  }
  async compareAndSwap(hash: string, previousVersion: number, document: SessionDocument, expiresAt: number): Promise<boolean> {
    const result=this.db.prepare('UPDATE sessions SET version=?,payload=?,expires_at=? WHERE token_hash=? AND version=?').run(document.state.version,JSON.stringify(document),expiresAt,hash,previousVersion);
    return result.changes===1;
  }
  async readEvidence(key:string,now:number):Promise<CulturalEvidence|null> {
    const row=this.db.prepare('SELECT payload FROM cache WHERE key=? AND expires_at>?').get(key,now) as {payload:string}|undefined;
    return row ? JSON.parse(row.payload) as CulturalEvidence : null;
  }
  async writeEvidence(key:string,value:CulturalEvidence,expiresAt:number):Promise<void> {
    this.db.prepare('INSERT INTO cache(key,payload,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at').run(key,JSON.stringify(value),expiresAt);
  }
  async acquireLease(key:string,owner:string,now:number,expiresAt:number):Promise<boolean> {
    const row=this.db.prepare('INSERT INTO leases(key,owner,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE leases.expires_at<=? RETURNING owner').get(key,owner,expiresAt,now) as {owner:string}|undefined;
    return row?.owner===owner;
  }
  async releaseLease(key:string,owner:string):Promise<void> { this.db.prepare('DELETE FROM leases WHERE key=? AND owner=?').run(key,owner); }
  async reserve(key:string,limit:number,now:number,expiresAt:number,intervalMs=0):Promise<number|null> {
    if(!Number.isSafeInteger(limit)||limit<1) return null;
    const row=this.db.prepare(`INSERT INTO counters(key,count,next_at,expires_at) VALUES(?,1,?,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN counters.expires_at<=? THEN 1 ELSE counters.count+1 END,
      next_at=MAX(?,CASE WHEN counters.expires_at<=? THEN ? ELSE counters.next_at END)+?,expires_at=excluded.expires_at
      WHERE counters.expires_at<=? OR counters.count<? RETURNING next_at`).get(key,now+intervalMs,expiresAt,now,now,now,now,intervalMs,now,limit) as {next_at:number}|undefined;
    return row ? row.next_at-intervalMs : null;
  }
  async cleanup(now:number):Promise<void> {
    for(const table of ['sessions','cache','counters','leases'])this.db.prepare(`DELETE FROM ${table} WHERE expires_at<=?`).run(now);
  }
  close():void { this.db.close(); }
}
