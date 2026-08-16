import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/demo", "/privacy", "/terms"];

  return routes.map((route, index) => ({
    url: `${siteConfig.url}${route}`,
    changeFrequency: index < 3 ? "monthly" : "yearly",
    priority: index === 0 ? 1 : index < 3 ? 0.8 : 0.3,
  }));
}

