import { Router } from "express";

import { HeatmapController } from "./heatmap.controller";

export const heatmapRouter = Router();

const controller = new HeatmapController();

heatmapRouter.post("/activity", controller.record.bind(controller));

heatmapRouter.get("/:userId/:year", controller.get.bind(controller));
