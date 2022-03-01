import { Server } from './server';
import { App } from './app';

const app = new App();

const server = new Server(app.expressApp);

server.listen();
