/**
 * F2 offline-first sync: IndexedDB outbox queue.
 *
 * When the network is unavailable (or the API call fails with a network
 * error), mutating operations are stored here with status "pending".
 * The sync engine (lib/sync-engine.ts) replays them FIFO when online.
 *
 * Uses raw IndexedDB (no external dep) — small, dependency-free, works
 * in every modern mobile browser.
 */

export type QueuedOpType = "payment.create";

export type QueuedOpStatus = "pending" | "syncing" | "synced" | "failed";

export interface QueuedOp {
  /** Auto-generated key. */
  id?: number;
  /** Operation type — determines which API endpoint to replay against. */
  type: QueuedOpType;
  /** JSON-serializable payload (the original POST body). */
  payload: Record<string, unknown>;
  /** Human-readable label for the UI (e.g. "জমা ৳৫০০ — করিম"). */
  label: string;
  status: QueuedOpStatus;
  /** Incremented on each failed attempt. */
  attempts: number;
  /** Last error message, if any. */
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "foundation-offline";
const DB_VERSION = 1;
const STORE = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    t.oncomplete = () => {
      // resolve via request below
    };
    t.onerror = () => reject(t.error ?? new Error("Transaction failed"));
    const run = async () => {
      try {
        const r = fn(store);
        if (r instanceof Promise) {
          resolve(await r);
        } else {
          r.onsuccess = () => resolve(r.result as T);
          r.onerror = () => reject(r.error ?? new Error("Request failed"));
        }
      } catch (e) {
        reject(e);
      }
    };
    run();
  });
}

/** Add an operation to the outbox. Returns the generated id. */
export async function queueOp(
  type: QueuedOpType,
  payload: Record<string, unknown>,
  label: string
): Promise<number> {
  const db = await openDb();
  const now = Date.now();
  const op: QueuedOp = {
    type,
    payload,
    label,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  const id = await tx<IDBValidKey>(db, "readwrite", (s) => s.add(op));
  db.close();
  return Number(id);
}

/** List operations, optionally filtered by status (FIFO order). */
export async function listOps(
  status?: QueuedOpStatus | QueuedOpStatus[]
): Promise<QueuedOp[]> {
  const db = await openDb();
  const statuses = status
    ? Array.isArray(status)
      ? status
      : [status]
    : null;
  const all = await tx<QueuedOp[]>(db, "readonly", (s) => s.getAll());
  db.close();
  const filtered = statuses ? all.filter((o) => statuses.includes(o.status)) : all;
  return filtered.sort((a, b) => (a.createdAt - b.createdAt) || ((a.id ?? 0) - (b.id ?? 0)));
}

/** Count pending + failed ops (the "needs sync" badge number). */
export async function countUnsynced(): Promise<number> {
  const ops = await listOps(["pending", "failed", "syncing"]);
  return ops.length;
}

/** Update an operation's status. */
export async function setOpStatus(
  id: number,
  status: QueuedOpStatus,
  lastError?: string
): Promise<void> {
  const db = await openDb();
  await tx(db, "readwrite", async (s) => {
    const get = s.get(id);
    const op: QueuedOp = await new Promise((resolve, reject) => {
      get.onsuccess = () => resolve(get.result as QueuedOp);
      get.onerror = () => reject(get.error);
    });
    if (!op) return;
    op.status = status;
    op.updatedAt = Date.now();
    if (status === "failed") op.attempts += 1;
    if (lastError !== undefined) op.lastError = lastError;
    await new Promise<void>((resolve, reject) => {
      const put = s.put(op);
      put.onsuccess = () => resolve();
      put.onerror = () => reject(put.error);
    });
  });
  db.close();
}

/** Remove synced operations older than `maxAgeMs` (housekeeping). */
export async function pruneSynced(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const db = await openDb();
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  await tx(db, "readwrite", async (s) => {
    const all: QueuedOp[] = await new Promise((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result as QueuedOp[]);
      req.onerror = () => reject(req.error);
    });
    for (const op of all) {
      if (op.status === "synced" && op.updatedAt < cutoff && op.id !== undefined) {
        await new Promise<void>((resolve, reject) => {
          const del = s.delete(op.id!);
          del.onsuccess = () => resolve();
          del.onerror = () => reject(del.error);
        });
        removed++;
      }
    }
  });
  db.close();
  return removed;
}

/** Delete a single queued op (user-initiated discard). */
export async function deleteOp(id: number): Promise<void> {
  const db = await openDb();
  await tx(db, "readwrite", (s) => s.delete(id));
  db.close();
}
