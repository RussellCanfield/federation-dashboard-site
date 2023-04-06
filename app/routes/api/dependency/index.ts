import { Response } from "@remix-run/node";
import { type LoaderFunction } from "@remix-run/server-runtime";
import { getDependencies } from "../../../models/dependency.server";

export const loader: LoaderFunction = async ({ request }) => {
  const dependencies = await getDependencies();

  return new Response(JSON.stringify(dependencies), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
