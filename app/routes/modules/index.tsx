import { useLoaderData, useNavigate } from "@remix-run/react";
import { type LoaderFunction } from "@remix-run/server-runtime";
import { useEffect, useMemo } from "react";
import * as d3 from "d3";
import {
  getModulesWithRelationships,
  type FederatedApp,
} from "~/models/app.server";
import { type SimulationNodeDatum } from "d3";
import Toolbar from "~/components/toolbar";
import useWindow from "~/hooks/useWindow";

export const loader: LoaderFunction = async (args): Promise<FederatedApp[]> => {
  return await getModulesWithRelationships();
};

export default function FederatedModules() {
  const loaderData = useLoaderData() as FederatedApp[];
  const navigate = useNavigate();

  const { width: windowWidth, height: windowHeight } = useWindow();

  const defaultRadius = 48;
  const data = useMemo(
    () =>
      loaderData.map((d) => {
        const relationshipFactor = d.relationships?.length
          ? d.relationships?.length
          : 1;

        return {
          ...d,
          radius: relationshipFactor * defaultRadius,
        };
      }),
    [loaderData]
  );

  useEffect(() => {
    const margin = { top: 5, right: 5, bottom: 5, left: 5 },
      width = windowWidth - margin.left - margin.right,
      height = windowHeight - margin.top - margin.bottom;

    const svg = d3
      .select("#graph")
      .append("svg")
      .style("width", width)
      .style("height", height);

    d3.forceSimulation(data as SimulationNodeDatum[])
      .alphaTarget(0.3) // stay hot
      .velocityDecay(0.1) // low friction
      .force("x", d3.forceX().strength(0.01))
      .force("y", d3.forceY().strength(0.01))
      .force("charge", d3.forceManyBody().strength(5))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d) => (d as { radius: number }).radius + 0.5)
          .iterations(3)
      )
      .on("tick", ticked);

    function ticked() {
      const g = svg
        .selectAll("g")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", function (d, i) {
          return "translate(" + d.x + "," + d.y + ")";
        });

      g.append("circle")
        .style("fill", "#3260a8")
        .attr("r", (d) => d.radius);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "14px")
        .text(function (d) {
          return d.name;
        });

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "14px")
        .attr("y", 18)
        .text(function (d) {
          return d.version ?? "";
        });
    }

    return () => {
      svg.remove();
    };
  }, [data, navigate, windowWidth, windowHeight]);

  const loading = windowHeight === 0 || windowWidth === 0;

  if (loading) return <></>;

  return (
    <>
      <Toolbar></Toolbar>
      <div
        id="graph"
        style={{
          width: windowWidth,
          height: windowHeight,
          position: "relative",
          backgroundColor: "#e4e4e4",
          zIndex: 1,
        }}
      ></div>
    </>
  );
}
