import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";

type Props = {
  layers: Layer[];
  center?: [number, number];
  zoom?: number;
  styleUrl?: string;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const DEFAULT_CENTER: [number, number] = [-114.3718, 62.4540];

export function MapView({
  layers,
  center = DEFAULT_CENTER,
  zoom = 15,
  styleUrl = "mapbox://styles/mapbox/dark-v11",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      alert("Missing VITE_MAPBOX_TOKEN in .env.local");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      minZoom: 15,
      maxZoom: 18,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers,
    });

    map.addControl(overlay as never);

    map.on("load", () => {
      map.easeTo({
        pitch: 40,
        bearing: -35,
        duration: 2000,
      });
      
      map.on("click", (e) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        console.log("点击位置经纬度:", lng, lat);
      });

      const styleLayers = map.getStyle().layers;

      styleLayers?.forEach((layer) => {
        if (layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      });

      const labelLayerId = styleLayers?.find(
        (l) => l.type === "symbol" && (l.layout as Record<string, unknown>)?.["text-field"]
      )?.id;

      const beforeId = labelLayerId ?? undefined;

      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 15,
            filter: ["==", "extrude", "true"],
            paint: {
              // 【核心修改】：压暗建筑颜色，提高不透明度，打造深邃的夜间环境
              "fill-extrusion-color": "#12141a", // 非常深的藏青/炭灰色
              "fill-extrusion-opacity": 0.85,    // 更加实体化，不那么透明
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
            },
          },
          beforeId
        );
      }
    });

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    overlayRef.current?.setProps({ layers });
  }, [layers]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}