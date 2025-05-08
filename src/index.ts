import { initServer } from "./server.js";

initServer(process.env.TRANSPORT_TYPE as "http" | "stdio");
