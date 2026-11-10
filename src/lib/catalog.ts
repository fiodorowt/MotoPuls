import { cache } from "react";
import { db } from "./db";

/** Kategorie oferty z aktywnymi usługami – w kolejności ustalonej w panelu. */
export const getCategories = cache(async () =>
  db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { services: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  }),
);

export type CategoryWithServices = Awaited<ReturnType<typeof getCategories>>[number];

export const getTestimonials = cache(async () =>
  db.testimonial.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
);

export const getGallery = cache(async () =>
  db.media.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
);
