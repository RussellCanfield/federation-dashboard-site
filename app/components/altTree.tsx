import { useState } from "react";
import { Group } from "@visx/group";
import { hierarchy, Tree } from "@visx/hierarchy";
import { pointRadial } from "d3-shape";
import { LinkVertical } from "@visx/shape";

const defaultMargin = { top: 64, left: 30, right: 30, bottom: 70 };

export type LinkTypesProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
};

export default function AltTree({
  width: totalWidth,
  height: totalHeight,
  nodes: data,
  margin = defaultMargin,
}: LinkTypesProps & { nodes: AltTreeNode }) {
  const [layout] = useState<string>("cartesian");
  const [orientation] = useState<string>("vertical");
  const [, setForceUpdate] = useState<number>(0);

  if (!data) return <></>;

  const forceUpdate = () => {
    setForceUpdate(new Date().getTime());
  };

  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;

  let origin: { x: number; y: number };
  let sizeWidth: number;
  let sizeHeight: number;

  if (layout === "polar") {
    origin = {
      x: innerWidth / 2,
      y: innerHeight / 2,
    };
    sizeWidth = 2 * Math.PI;
    sizeHeight = Math.min(innerWidth, innerHeight) / 2;
  } else {
    origin = { x: 0, y: 0 };
    if (orientation === "vertical") {
      sizeWidth = innerWidth;
      sizeHeight = innerHeight;
    } else {
      sizeWidth = innerHeight;
      sizeHeight = innerWidth;
    }
  }

  return totalWidth < 10 ? null : (
    <div className="view">
      <svg width={totalWidth} height={totalHeight}>
        <rect width={totalWidth} height={totalHeight} rx={14} fill="#e4e4e4" />
        <Group top={margin.top} left={margin.left}>
          <Tree
            root={hierarchy(data, (d) => (d.isExpanded ? null : d.children))}
            size={[sizeWidth, sizeHeight]}
            separation={(a, b) => (a.parent === b.parent ? 1 : 0.5) / a.depth}
          >
            {(tree) => (
              <Group top={origin.y} left={origin.x}>
                {tree.links().map((link, i) => (
                  <LinkVertical
                    key={i}
                    data={link}
                    stroke="#000"
                    strokeWidth="1"
                    fill="none"
                  />
                ))}

                {tree.descendants().map((node, key) => {
                  const width = 96;
                  const height = 72;

                  let top: number;
                  let left: number;
                  if (layout === "polar") {
                    const [radialX, radialY] = pointRadial(node.x, node.y);
                    top = radialY;
                    left = radialX;
                  } else if (orientation === "vertical") {
                    top = node.y;
                    left = node.x;
                  } else {
                    top = node.x;
                    left = node.y;
                  }

                  return (
                    <Group top={top} left={left} key={key}>
                      {node.depth === 0 && (
                        <circle
                          r={12}
                          fill="url('#links-gradient')"
                          onClick={() => {
                            node.data.isExpanded = !node.data.isExpanded;
                            forceUpdate();
                          }}
                        />
                      )}
                      <rect
                        height={height}
                        width={width}
                        y={-height / 2}
                        x={-width / 2}
                        fill="#0064b0"
                        stroke={node.data.children ? "#0064b0" : "#0064b0"}
                        strokeWidth={1}
                        strokeDasharray={node.data.children ? "0" : "2,2"}
                        strokeOpacity={node.data.children ? 1 : 0.6}
                        rx={node.data.children ? 0 : 10}
                        onClick={() => {
                          node.data.isExpanded = !node.data.isExpanded;
                          forceUpdate();
                        }}
                      />
                      <text
                        dy=".33em"
                        fontSize={12}
                        fontFamily="Arial"
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                        fill={
                          node.depth === 0
                            ? "#fff"
                            : node.children
                            ? "white"
                            : "#fff"
                        }
                      >
                        {node.data.name}
                      </text>
                      {!!node.data.version && (
                        <text
                          dy="1.5em"
                          fontSize={12}
                          fontFamily="Arial"
                          textAnchor="middle"
                          style={{ pointerEvents: "none" }}
                          fill={
                            node.depth === 0
                              ? "#fff"
                              : node.children
                              ? "white"
                              : "#fff"
                          }
                        >
                          {node.data.version}
                        </text>
                      )}
                    </Group>
                  );
                })}
              </Group>
            )}
          </Tree>
        </Group>
      </svg>
    </div>
  );
}
