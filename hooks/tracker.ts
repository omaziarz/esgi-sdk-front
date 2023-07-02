import { Ref, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import ESGIAnalytics from "..";
import { useThrottle } from "./debounce";

interface TrackerParams {
  tag: string; // to register for backend app
  event: "click";
}

export function useTracker<T>({ tag, event }: TrackerParams): Ref<T> {
  const ref = useRef<null | Element>(null);

  const callback = () => {
    ESGIAnalytics.handleActiveUser();
    console.log(`Event type : ${event}, tag : ${tag}`);
    ESGIAnalytics.sendAnalyticsEvent([
      {
        timestamp: Date.now(),
        dimensions: {
          event,
          tag,
        },
      },
    ]);
  };

  useEffect(() => {
    switch (event) {
      case "click": {
        const element = ref.current;

        if (element) {
          element.addEventListener("click", callback);
        }

        return () => {
          element && element.removeEventListener("click", callback);
        };
      }
      default:
        break;
    }
  }, [ref.current]);

  return ref as Ref<T>;
}

export function useMouseTracker<T>(): Ref<T> {
  const [mousePositions, setMousePositions] = useState<
    {
      x: number;
      y: number;
      resolution: { width: number; height: number };
    }[]
  >([]);
  const ref = useRef<null | HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent) => {
    ESGIAnalytics.handleActiveUser();
    setMousePositions((d: any) => [
      ...d,
      {
        x: event.clientX,
        y: event.clientY,
        resolution: ESGIAnalytics.getResolutions(),
      },
    ]);
  };

  const throttledPositions = useThrottle(mousePositions, 2000);

  useEffect(() => {
    const element = ref.current;

    if (element) {
      element.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [ref.current]);

  useEffect(() => {
    ESGIAnalytics.sendAnalyticsEvent(
      mousePositions.map(
        (m: {
          x: number;
          y: number;
          resolution: { height: number; width: number };
        }) => ({
          timestamp: Date.now(),
          dimensions: {
            event: "mousemove",
            meta: {
              x: m.x,
              y: m.y,
            },
            resolution: m.resolution,
          },
        })
      )
    );
    setMousePositions([]);
  }, [throttledPositions]);

  return ref as Ref<T>;
}

export const useRouterMiddleware = () => {
  const location = useLocation();

  useEffect(() => {
    ESGIAnalytics.handleActiveUser();
    ESGIAnalytics.sendAnalyticsEvent([
      {
        timestamp: Date.now(),
        dimensions: {
          route: location.pathname,
        },
      },
    ]);
  }, [location]);
};
