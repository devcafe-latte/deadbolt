import bodyParser from 'body-parser';
import express = require('express');
import { Server } from 'http';

import container from './DiContainer';
import { publicRoutes } from './routes';

class DeadboltApi {
  private _app: express.Application = express();
  private _server: Server

  get app(): express.Application { return this._app; }

  constructor() {
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.urlencoded({ extended: true }));

    //Routes
    this._app.use(publicRoutes);

    this.setErrorHandling();
  }

  close() {
    this._server.close();
  }

  async listen() {
    //warm up
    try {
      await container.ready();
    } catch (err) {
      console.error("Fatal error, couldn't start Container");
      console.error(err);
      process.exit(1);
    }

    const port = container.settings.port;
    this._server = this._app.listen(port, () => {
      console.log(`SGF API is listening on port ${port}!`);
    });

    this._server.on('close', async () => {
      console.info("Closing DB Connections...");
      await container.db.end()
        .catch(() => { console.warn("Closing DB connections did not go gracefully."); });
      console.info("Exiting.");
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.info("Got SIGTERM. Gracefully shutting down.");
      this._server.close();
    });
  }

  private setErrorHandling() {
    //404 Handler
    this._app.use((req, res) => {

      res.status(404);
      const error = {
        message: "Not found: " + req.method + " " + req.path,
        status: 404
      };
      throw error;
    });

    //Uncaught Error handling
    this._app.use((err, req, res, next) => {
      res.status(err.status || 500);

      const data = {
        status: "failed",
        path: req.path,
        reason: err.message || "Unknown Error",
        code: err.code || undefined,
        error: undefined
      }

      if (container.settings.debug) {
        data.error = err;
      }

      console.log(`[${err.status || 500}] ${data.code || ''} ${data.reason}`);

      res.send(data);
    });

  }
}

export const deadbolt = new DeadboltApi();