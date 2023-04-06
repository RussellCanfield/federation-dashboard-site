import {
  RectangleGroupIcon,
  Square3Stack3DIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/solid";
import { Link } from "@remix-run/react";

const Toolbar = () => {
  return (
    <div className="toolbar">
      <div className="toolbar-item tooltip">
        <Link to="/">
          <RectangleGroupIcon />
        </Link>
        <span className="tooltiptext">Applications</span>
      </div>
      <div className="toolbar-item tooltip">
        <Link to="/dependencies">
          <Square3Stack3DIcon />
        </Link>
        <span className="tooltiptext">Dependencies</span>
      </div>
      <div className="toolbar-item tooltip">
        <Link to="/modules">
          <PuzzlePieceIcon />
        </Link>
        <span className="tooltiptext">Modules</span>
      </div>
    </div>
  );
};

export default Toolbar;
