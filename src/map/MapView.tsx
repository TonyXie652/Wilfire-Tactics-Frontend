import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";

type Props = {
  layers: Layer[];
  center?: [number, number];
  zoom?: number;
  styleUrl?: string;
  /** 点击地图空白处的回调（经纬度）*/
  onMapClick?: (lng: number, lat: number) => void;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const DEFAULT_CENTER: [number, number] = [-114.3718, 62.4540];

export function MapView({
  layers,
  center = DEFAULT_CENTER,
  zoom = 15,
  styleUrl = "mapbox://styles/mapbox/dark-v11",
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

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
        onMapClickRef.current?.(lng, lat);
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
              "fill-extrusion-color": "#909396",
              "fill-extrusion-opacity": 0.5,
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