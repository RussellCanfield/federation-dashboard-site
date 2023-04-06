import { useLoaderData, useNavigate } from "@remix-run/react";
import { type LoaderFunction } from "@remix-run/server-runtime";
import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { type Dependency, getDependencies } from "~/models/dependency.server";
import {
  type FederatedApp,
  getModulesWithRelationships,
} from "~/models/app.server";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3";
import Toolbar from "~/components/toolbar";
import useWindow from "~/hooks/useWindow";
import Search from "~/components/search";

export type Dependencies = {
  dependencies: Dependency[];
  apps: FederatedApp[];
};

export const loader: LoaderFunction = async (args): Promise<Dependencies> => {
  const dependencies = await getDependencies();
  const apps = await getModulesWithRelationships();

  return {
    dependencies,
    apps,
  } satisfies Dependencies;
};

export default function FederatedAppDashboard() {
  const [filterValue, setFilterValue] = useState<string>("");
  const loaderData = useLoaderData() as Dependencies;
  const navigate = useNavigate();

  // apply search data
  const deps = loaderData.dependencies.filter((d) =>
    filterValue ? d.name.indexOf(filterValue) > -1 : true
  );

  // only show dependencies that have relationships to actual apps
  const relationships = deps.reduce((p, d) => {
    const nodeRelationships = d.relationships?.reduce((p, c) => {
      if (!loaderData.apps.some((a) => a.id === c.fromId)) return p;

      return p.concat({
        source: c.toId,
        target: c.fromId,
      });
    }, [] as SimulationLinkDatum<SimulationNodeDatum>[]);

    return p.concat(nodeRelationships ?? []);
  }, [] as SimulationLinkDatum<SimulationNodeDatum>[]);

  // only show apps that have relationships to dependencies
  const apps = loaderData.apps.filter((a) =>
    relationships.some((r) => a.id === r.target || a.id === r.source)
  );

  const data = useMemo(() => {
    return [...deps, ...apps];
  }, [deps, apps]);

  const { width: windowWidth, height: windowHeight } = useWindow();

  useEffect(() => {
    const margin = { top: 5, right: 5, bottom: 5, left: 5 },
      width = windowWidth - margin.left - margin.right,
      height = windowHeight - margin.top - margin.bottom;

    const svg = d3
      .select("#graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${windowWidth} ${windowHeight}`)
      .attr("fill", "currentColor")
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle");

    const link = svg
      .selectAll("line")
      .data(relationships)
      .join("line")
      .style("stroke", "#000");

    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll(".node")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", function (d, i) {
        //(d.x = i * 70 + 50), (d.y = window.innerHeight / 2);
        return "translate(" + d.x + "," + d.y + ")";
      });

    node
      .append("circle")
      .attr("class", "node")
      .attr("r", 48)
      .style("fill", "#3260a8");

    node
      .append("foreignObject")
      .attr("width", 100)
      .attr("height", 100)
      .attr("x", -50)
      .attr("y", -50)
      .append("xhtml:body")
      .style("height", "100%")
      .append("xhtml:div")
      .style("height", "100%")
      .style("color", "#fff")
      .style("font-size", "14px")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .html((d) => d.name);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "14px")
      .attr("y", 24)
      .text(function (d) {
        return d.version as string;
      });

    // d3.forceSimulation(data as SimulationNodeDatum[]) // Force algorithm is applied to data.nodes
    //   .force(
    //     "link",
    //     d3
    //       .forceLink() // This force provides links between nodes
    //       .id(function (d, i, nodesData) {
    //         return (d as Dependency).id;
    //       }) // This provide  the id of a node
    //       .links(relationships)
    //   )
    //   .force("charge", d3.forceManyBody().strength(-12000)) // This adds repulsion between nodes. Play with the -400 for the repulsion strength
    //   .force("center", d3.forceCenter(windowWidth / 2, windowHeight / 2)) // This force attracts nodes to the center of the svg area
    //   .on("tick", ticked);

    d3.forceSimulation(data as SimulationNodeDatum[])
      .force("x", d3.forceX().strength(0.01))
      .force("y", d3.forceY().strength(0.01))
      .force(
        "link",
        d3
          .forceLink() // This force provides links between nodes
          .id(function (d, i, nodesData) {
            return (d as Dependency).id;
          }) // This provide  the id of a node
          .links(relationships)
      )
      .force("charge", d3.forceManyBody().strength(-1800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", ticked);

    function ticked() {
      link
        .attr("x1", function (d) {
          return d.source.x;
        })
        .attr("y1", function (d) {
          return d.source.y;
        })
        .attr("x2", function (d) {
          return d.target.x;
        })
        .attr("y2", function (d) {
          return d.target.y;
        });

      node.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    }

    return () => {
      svg.remove();
    };
  }, [data, relationships, navigate, windowWidth, windowHeight]);

  const onSearchChange = (value: string) => {
    setFilterValue(value);
  };

  const loading = windowHeight === 0 || windowWidth === 0;

  return (
    <>
      {loading && <></>}
      {!loading && (
        <>
          <Search onChange={onSearchChange} />
          <Toolbar></Toolbar>
          <div
            id="graph"
            style={{
              width: windowWidth,
              height: windowHeight,
              position: "relative",
              zIndex: 1,
            }}
          ></div>
        </>
      )}
    </>
  );
}
