import { driver } from "../db.server";
import neo4j, { type Relationship } from "neo4j-driver";
import {
  type SharedType,
  type FederatedAppManifest,
  type FederatedAppRelationship,
} from "./app.server";

export type SharedModule = {
  singleton: boolean;
  requiredVersion: string;
};

export type Dependency = {
  id: string;
  name: string;
  version: (string | SharedType)[] | SharedType;
  relationships: FederatedAppRelationship[];
};

export async function getDependencies(): Promise<Dependency[]> {
  const session = driver.session({
    database: "neo4j",
    defaultAccessMode: neo4j.session.READ,
  });

  const results = await session.run(
    `MATCH (dep:Dependency) 
      OPTIONAL MATCH (app:App)-[relationship:Dependency]-(dep)
      RETURN DISTINCT dep, collect(relationship) as relationships`
  );

  const records = results.records.map((r) => {
    const record = r.toObject();
    let appRelationships: FederatedAppRelationship[] = [];

    const { dep, relationships } = record;

    if (relationships?.length > 0) {
      appRelationships = (relationships as Relationship[]).map((r) => ({
        fromId: r.startNodeElementId,
        toId: r.endNodeElementId,
      }));
    }

    return {
      id: dep.elementId,
      ...dep.properties,
      relationships: appRelationships,
    };
  });

  return records;
}

export async function saveDependencies(app: FederatedAppManifest) {
  const session = driver.session({
    database: "neo4j",
    defaultAccessMode: neo4j.session.WRITE,
  });

  const { name, shared } = app;

  for await (const dependency of Object.entries(shared ?? [])) {
    const [moduleName, moduleVersion] = dependency;

    //create dependency
    await session.run(
      `MERGE (m:Dependency {name: $name, version: $version})
        ON CREATE SET m.name = $name,  m.version = $version
      RETURN m`,
      {
        name: moduleName,
        version:
          typeof moduleVersion == "string"
            ? moduleVersion
            : (moduleVersion as SharedModule).requiredVersion,
      }
    );

    //relate app to dependency
    await session.run(
      `
          MATCH
              (a:App),
              (d:Dependency)
            WHERE a.name = $name1 AND d.name = $name2
            MERGE (a)-[r:Dependency]->(d)
            RETURN type(r)`,
      {
        name1: name,
        name2: moduleName,
      }
    );
  }
}
