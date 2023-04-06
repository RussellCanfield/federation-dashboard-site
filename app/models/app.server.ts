import { driver } from "../db.server";
import neo4j, { type Relationship } from "neo4j-driver";
import { type SharedModule } from "./dependency.server";

export type FederatedAppManifest = {
  host?: string;
  name: string;
  version?: string;
  remotes?: Record<string, string>;
  shared?: (string | SharedType)[] | SharedType;
};

export type SharedType = {
  [s: string]: string | SharedModule;
};

export type FederatedApp = {
  id: string;
  host?: string;
  name: string;
  version?: string;
  remotes?: Record<string, string>;
  relationships?: FederatedAppRelationship[];
  shared?: (string | SharedType)[] | SharedType;
};

export type FederatedAppRelationship = {
  fromId: string;
  toId: string;
};

export async function getFederatedApps() {
  const session = driver.session({
    database: "neo4j",
    defaultAccessMode: neo4j.session.READ,
  });

  const results = await session.run(
    `MATCH (app:App)
      WHERE (app.name = app.host)
      OPTIONAL MATCH (app)<-[relationship:Remote]-()
    RETURN DISTINCT app, collect(relationship) as relationship`
  );

  const records = results.records.map((r) => {
    const record = r.toObject();

    const relationships: FederatedAppRelationship[] = [];

    const { app, relationship } = record;

    if (relationship) {
      relationships.push({
        fromId: relationship.startNodeElementId,
        toId: relationship.endNodeElementId,
      });
    }

    return {
      id: app.elementId,
      ...app.properties,
      relationships,
    };
  });

  return records;
}

export async function getFederatedAppsByHost(host: string) {
  const session = driver.session({
    database: "neo4j",
    defaultAccessMode: neo4j.session.READ,
  });

  const results = await session.run(
    `MATCH (app:App)
      MATCH (other:App)-[relationship:Remote]-(app)
      WHERE (other.host IS NULL or other.host = $host or other.host = "")
      RETURN DISTINCT app, collect(relationship) as relationships`,
    {
      host,
    }
  );

  const records = results.records.map((r) => {
    const record = r.toObject();
    let appRelationships: FederatedAppRelationship[] = [];

    const { app, relationships } = record;

    if (relationships?.length > 0) {
      appRelationships = (relationships as Relationship[])
        .filter((r) => r.endNodeElementId !== app.elementId)
        .map((r) => ({
          fromId: r.startNodeElementId,
          toId: r.endNodeElementId,
        }));
    }

    const federatedApp: FederatedApp = {
      id: app.elementId,
      ...app.properties,
      relationships: appRelationships,
    };

    return federatedApp;
  });

  return records;
}

export async function getModulesWithRelationships() {
  const session = driver.session({
    database: "neo4j",
    defaultAccessMode: neo4j.session.READ,
  });

  const results = await session.run(
    `MATCH (app:App)
    OPTIONAL MATCH (app)-[relationship:Remote]-(other:App)
    RETURN DISTINCT app, collect(relationship) as relationships`
  );

  const records = results.records.map((r) => {
    const record = r.toObject();
    let appRelationships: FederatedAppRelationship[] = [];

    const { app, relationships } = record;

    if (relationships?.length > 0) {
      appRelationships = (relationships as Relationship[])
        .filter((r) => r.endNodeElementId !== app.elementId)
        .map((r) => ({
          fromId: r.startNodeElementId,
          toId: r.endNodeElementId,
        }));
    }

    const federatedApp: FederatedApp = {
      id: app.elementId,
      ...app.properties,
      relationships: appRelationships,
    };

    return federatedApp;
  });

  return records;
}

export async function saveFederatedApp(app: FederatedAppManifest) {
  const session = driver.session({
    database: "neo4j",
    defaultAccessMode: neo4j.session.WRITE,
  });

  const { host, name, version, remotes } = app;

  //create app
  const result = await session.run(
    `MERGE (m:App {name: $name})
      ON CREATE SET m.name = $name, m.host = $host, m.version = $version
      ON MATCH SET m.version = $version
    RETURN m`,
    {
      name,
      host: host ?? "",
      version: version ?? "",
    }
  );

  //create app for each remote if not exists
  for await (const remote of Object.entries(remotes ?? [])) {
    const [remoteName] = remote;

    await session.run(
      `MERGE (m:App {name: $name})
        ON CREATE SET m.name = $name, m.host = $host, m.version = $version
      RETURN m`,
      {
        name: remoteName,
        host: host ?? "",
        version: version ?? "",
      }
    );

    //relate the app and remote
    await session.run(
      `
        MATCH
            (a:App),
            (b:App)
          WHERE a.name = $name1 AND b.name = $name2
          MERGE (a)-[r:Remote]->(b)
          RETURN type(r)`,
      {
        name1: name,
        name2: remoteName,
      }
    );
  }

  if (host && host !== name) {
    //create host if not exists
    await session.run(
      `MERGE (m:App {name: $host})
        ON CREATE SET m.name = $host, m.host = $host, m.version = 'Unknown'
      RETURN m`,
      {
        host,
      }
    );

    //relate the host and app
    await session.run(
      `MATCH
          (a:App),
          (b:App)
        WHERE a.name = $name1 AND a.host = $name1 AND b.host = $name1 AND b.name = $name2
        MERGE (a)-[r:Remote]->(b)
        RETURN type(r)`,
      {
        name1: host,
        name2: name,
      }
    );
  }

  const record = result.records[0]["_fields"][0].properties;

  return {
    id: record["elementId"],
    name: record["name"],
    host: record["host"],
    version: record["version"],
  };
}
