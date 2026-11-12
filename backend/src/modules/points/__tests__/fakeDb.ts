import type { Db } from "../points.service.js";
/** In-memory stand-in for the Prisma delegates the points service uses. The real tables are not migrated yet, so no database is touched. */
type Row = Record<string, any>;
export function fakeDb(opts: { ignoreLocks?: boolean } = {}) {
  const locks = new Map<string, Promise<void>>();
  const tick = () => new Promise<void>((r) => setImmediate(r));
  const t = { completions: [] as Row[], streaks: new Map<string, Row>(), ledger: [] as Row[], readings: new Set<string>(), seq: 0, clock: new Date("2026-11-12T06:00:00Z"), failNextLedger: false, lockCalls: 0 };
  const dk = (d: Date) => d.toISOString().slice(0, 10);
  const db: any = {
    horoscopeCompletion: {
      createMany: async ({ data }: any) => {
        let count = 0;
        for (const r of data) if (!t.completions.some((c) => c.userId === r.userId && dk(c.localDate) === dk(r.localDate))) { t.completions.push({ ...r }); count++; }
        return { count };
      },
      findMany: async ({ where }: any) => t.completions.filter((c) => c.userId === where.userId && c.localDate >= where.localDate.gte && c.localDate <= where.localDate.lte).map((c) => ({ localDate: c.localDate })),
    },
    horoscopeStreak: {
      findUnique: async ({ where }: any) => t.streaks.get(where.userId) ?? null,
      upsert: async ({ where, create, update }: any) => { t.streaks.set(where.userId, t.streaks.has(where.userId) ? { ...t.streaks.get(where.userId), ...update } : { ...create }); },
    },
    dailyHoroscope: { findUnique: async ({ where }: any) => (t.readings.has(`${where.sign_horoscopeDate.sign}:${dk(where.sign_horoscopeDate.horoscopeDate)}`) ? { id: "r" } : null) },
    pointsLedger: {
      createMany: async ({ data }: any) => {
        if (t.failNextLedger) { t.failNextLedger = false; throw new Error("boom"); }
        let count = 0;
        for (const r of data) if (!t.ledger.some((l) => l.userId === r.userId && l.source === r.source && l.refKey === r.refKey)) { t.ledger.push({ id: `l${++t.seq}`, createdAt: new Date(t.clock), ...r }); count++; }
        return { count };
      },
      aggregate: async ({ where }: any) => {
        const rows = match(where);
        return { _sum: { points: rows.length ? rows.reduce((s, r) => s + r.points, 0) : null } };
      },
      groupBy: async ({ where }: any) => {
        const m = new Map<string, Row[]>();
        for (const r of match(where)) m.set(r.source, [...(m.get(r.source) ?? []), r]);
        return [...m].map(([source, rs]) => ({ source, _sum: { points: rs.reduce((s, r) => s + r.points, 0) }, _count: { _all: rs.length } }));
      },
      count: async ({ where }: any) => match(where).length,
      findMany: async ({ where, orderBy, skip = 0, take }: any) => {
        let rows = match(where);
        if (orderBy) rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (b.id > a.id ? 1 : -1));
        return rows.slice(skip, take === undefined ? undefined : skip + take);
      },
    },
    // Postgres advisory-lock model: a transaction that takes the user lock holds it until it ends. A failed transaction restores everything it touched.
    $transaction: async (fn: any) => {
      // The rollback point is taken once the lock is held, so a failed transaction only undoes its own work (as in Postgres).
      let snap: any = null;
      const take = () => { snap = { c: t.completions.map((x) => ({ ...x })), s: new Map([...t.streaks].map(([k, v]) => [k, { ...v }])), l: t.ledger.map((x) => ({ ...x })) }; };
      const held: (() => void)[] = [];
      const tx = Object.create(db);
      tx.$executeRaw = async (_s: TemplateStringsArray, key: string) => {
        t.lockCalls++;
        if (opts.ignoreLocks) { take(); return 0; }
        const prev = locks.get(key) ?? Promise.resolve();
        let release!: () => void;
        const mine = new Promise<void>((r) => (release = r));
        locks.set(key, prev.then(() => mine));
        await prev; held.push(release); take();
        return 0;
      };
      try { return await fn(tx); } catch (e) { if (snap) { t.completions = snap.c; t.streaks = snap.s; t.ledger = snap.l; } throw e; } finally { held.forEach((r) => r()); }
    },
  };
  // Every database call yields to the event loop, so concurrent requests really interleave (as they do against Postgres).
  for (const d of [db.horoscopeCompletion, db.horoscopeStreak, db.dailyHoroscope, db.pointsLedger]) for (const k of Object.keys(d)) { const fn = d[k]; d[k] = async (...a: any[]) => { await tick(); return fn(...a); }; }
  function match(where: any): Row[] {
    return t.ledger.filter((l) => l.userId === where.userId && (!where.source || (typeof where.source === "string" ? l.source === where.source : where.source.in.includes(l.source))) && (!where.createdAt || l.createdAt >= where.createdAt.gte));
  }
  const at = (iso: string) => { t.clock = new Date(iso); return t.clock; };
  return { db: db as Db, t, at };
}

