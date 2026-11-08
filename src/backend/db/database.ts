import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';

export type Database = SqliteDatabase | MysqlDatabase;

export interface IDatabase {
  init(): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ lastID: number | string; changes: number }>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// SQLite implementation
export class SqliteDatabase implements IDatabase {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastID: number | string; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db?.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// MySQL implementation
export class MysqlDatabase implements IDatabase {
  private pool: mysql.Pool | null = null;
  private config: mysql.PoolOptions;

  constructor(config: mysql.PoolOptions) {
    this.config = config;
  }

  async init(): Promise<void> {
    this.pool = mysql.createPool(this.config);
    // Test connection
    const conn = await this.pool.getConnection();
    await conn.release();
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.pool!.execute(sql, params as any);
    return rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastID: number | string; changes: number }> {
    const [result] = await this.pool!.execute(sql, params as any);
    const insertResult = result as mysql.ResultSetHeader;
    return { lastID: insertResult.insertId, changes: insertResult.affectedRows };
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const conn = await this.pool!.getConnection();
    await conn.beginTransaction();
    try {
      const result = await callback();
      await conn.commit();
      await conn.release();
      return result;
    } catch (error) {
      await conn.rollback();
      await conn.release();
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
}

// Factory function
export function createDatabase(config: { type: 'sqlite' | 'mysql'; path?: string; mysql?: mysql.PoolOptions }): Database {
  if (config.type === 'sqlite') {
    return new SqliteDatabase(config.path || 'lens-flare.db');
  } else if (config.type === 'mysql' && config.mysql) {
    return new MysqlDatabase(config.mysql);
  }
  throw new Error('Invalid database config');
}
