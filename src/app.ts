import express, { Application } from "express";
import cors from "cors";
import "dotenv/config";

import { routes } from "./routes";
import path from "path";
import { requestObservability } from "./observability/request.middleware";
import { errorObservability } from "./observability/error.middleware";

class App {
  public express: Application;

  constructor() {
    this.express = express();
    this.configuration();
    this.reqs();
    this.routes();
  }

  private configuration(): void {
    this.express.use(
      "/",
      cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
      }),
    );

    this.express.use("/", express.json());
    this.express.use("/", express.urlencoded({ extended: true }));
    this.express.use(requestObservability);
    this.express.set("view engine", "ejs");
    this.express.set("views", path.join(__dirname, "views"));
  }

  private routes(): void {
    this.express.use("/", routes);
    this.express.use(errorObservability);
  }

  private reqs(): void {
    // Mantido para compatibilidade com a ordem de inicialização.
  }
}

export const app = new App().express;
