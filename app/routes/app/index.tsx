import { type LoaderFunction } from "@remix-run/server-runtime";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { loader as appLoader } from "../api/apps";
import {
  type FederatedApp,
  type FederatedAppRelationship,
} from "~/models/app.server";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import Toolbar from "~/components/toolbar";
import { useMemo } from "react";
import AltTree from "~/components/altTree";

interface AltTreeNode {
  name: string;
  version?: string;
  isExpanded?: boolean;
  children?: AltTreeNode[];
}

export const loader: LoaderFunction = async (args): Promise<FederatedApp[]> => {
  return await appLoader(args);
};

function buildData(
  data: FederatedApp,
  nodeMap: Map<string, FederatedApp>
): AltTreeNode {
  return {
    name: data.name,
    version: data.version,
    children: data.relationships?.reduce((p, r) => {
      const node = buildNodeFromRelationship(r, nodeMap);

      if (node) {
        p.push(node);
      }

      return p;
    }, [] as AltTreeNode[]),
  };
}

function buildNodeFromRelationship(
  relationship: FederatedAppRelationship,
  nodeMap: Map<string, FederatedApp>
): AltTreeNode | null {
  const toNode = nodeMap.get(relationship.toId);

  if (!toNode) return null;

  return {
    name: toNode.name,
    version: toNode.version,
    children: toNode.relationships?.reduce((p, r) => {
      const node = buildNodeFromRelationship(r, nodeMap);

      if (node) {
        p.push(node);
      }

      return p;
    }, [] as AltTreeNode[]),
  };
}

const nodeMap: Map<string, FederatedApp> = new Map();

export default function Apps() {
  const graphData = useLoaderData() as FederatedApp[];
  const [params] = useSearchParams();

  const host = params.get("host");

  let hostApp: FederatedApp | undefined = undefined;

  graphData.forEach((app) => {
    if (app.host === host && app.name === host) {
      hostApp = app;
    }
    nodeMap.set(app.id, app);
  });

  const data = useMemo(() => {
    if (!hostApp) return [];
    return buildData(hostApp!, nodeMap);
  }, [hostApp]);

  if (!host)
    return (
      <>
        <Toolbar />
        <p className="text-center">No host specified.</p>
      </>
    );

  return (
    <>
      <Toolbar />
      <ParentSize>
        {({ width, height }) => (
          <AltTree nodes={data as AltTreeNode} width={width} height={height} />
        )}
      </ParentSize>
    </>
  );
}
