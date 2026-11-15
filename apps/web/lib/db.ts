import "server-only";
import { MongoClient, type Db } from "mongodb";

type MongoCache = {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
};

const globalRef = globalThis as unknown as { __formlikeMongo?: MongoCache };

const cached: MongoCache = (globalRef.__formlikeMongo ??= {
  client: null,
  promise: null,
});

export async function connectDb(): Promise<MongoClient> {
  if (cached.client) return cached.client;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not configured");
    // A rejected connect must not stay memoized: when DNS/network is down at
    // boot, a poisoned promise would 500 every DB route until restart.
    cached.promise = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 })
      .connect()
      .catch((err: unknown) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.client = await cached.promise;
  return cached.client;
}

/** App database: MONGODB_DATABASE_NAME when set, else the URI's db name. */
export async function getDb(): Promise<Db> {
  const client = await connectDb();
  const name = process.env.MONGODB_DATABASE_NAME;
  return name ? client.db(name) : client.db();
}
