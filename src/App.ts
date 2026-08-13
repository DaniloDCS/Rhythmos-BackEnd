import express, { Application } from "express";
import cors from "cors";
import "dotenv/config";

import router from "./routes";
import path from "path";

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
      cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
      }),
    );

    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
    this.express.set("view engine", "ejs");
    this.express.set("views", path.join(__dirname, "views"));
  }

  private routes(): void {
    this.express.use(router);
  }

  private reqs(): void {
    this.express.use((req, res, next) => {
      console.log("\n");
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
      );
      next();
    });
  }
}

export default new App().express;
