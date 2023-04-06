import { useEffect, useState } from "react";

export type WindowDimensions = {
  width: number;
  height: number;
};

const useWindow = () => {
  const [windowSize, setWindowSize] = useState<WindowDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};

export default useWindow;
