import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver;

declare global {
  var __db__: Driver;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// in production we'll have a single connection to the DB.
if (process.env.NODE_ENV === "production") {
  driver = neo4j.driver(
    `neo4j://${process.env.NEOHOST}:${process.env.NEOPORT}`,
    neo4j.auth.basic("neo4j", "neo4j")
  );
} else {
  if (!global.__db__) {
    global.__db__ = neo4j.driver(
      `neo4j://${process.env.NEOHOST}:${process.env.NEOPORT}`,
      neo4j.auth.basic("neo4j", "neo4j")
    );
  }
  driver = global.__db__;
}

export { driver };
