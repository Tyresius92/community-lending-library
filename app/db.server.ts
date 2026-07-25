import { PrismaClient } from "@prisma/client";
import invariant from "tiny-invariant";

import { singleton } from "./singleton.server";

// Hard-code a unique key, so we can look up the client when this module gets re-imported
const prisma = singleton("prisma", getPrismaClient);

function getPrismaClient() {
  invariant(
    typeof process.env.DATABASE_POOLER_URL === "string",
    "DATABASE_POOLER_URL env var not set",
  );

  // NOTE: during development if you change anything in this function, remember
  // that this only runs once per server restart and won't automatically be
  // re-run per request like everything else is. So if you need to change
  // something in this file, you'll need to manually restart the server.
  const client = new PrismaClient();
  // connect eagerly
  client.$connect();

  return client;
}

export { prisma };
