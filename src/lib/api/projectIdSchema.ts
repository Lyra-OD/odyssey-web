import { z } from "zod";

/** Shared Zod schema for `params.id` on `/api/projects/[id]/*` routes. */
export const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });
