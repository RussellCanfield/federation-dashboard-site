import { Response } from "@remix-run/node";
import {
  type LoaderFunction,
  type ActionFunction,
} from "@remix-run/server-runtime";
import type { FederatedAppManifest } from "../../../models/app.server";
import {
  getFederatedApps,
  getFederatedAppsByHost,
  saveFederatedApp,
} from "../../../models/app.server";
import { saveDependencies } from "../../../models/dependency.server";

export const action: ActionFunction = async ({ request }) => {
  const federatedApp = (await request.json()) as FederatedAppManifest;

  const result = await saveFederatedApp(federatedApp);
  await saveDependencies(federatedApp);
  return result;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);

  let data = [];

  const host = search.get("host");

  if (!host) {
    data = await getFederatedApps();
  } else {
    data = await getFederatedAppsByHost(host);
  }

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
