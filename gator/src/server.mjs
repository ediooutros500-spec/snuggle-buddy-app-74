import { readConfig } from "./config.mjs";
import { createGatorServer } from "./app.mjs";
import { createRegistration } from "./registration.mjs";
import { registrationServices } from "./registration-services.mjs";

const config = readConfig();
const server = createGatorServer(config, createRegistration(registrationServices()));
server.listen(config.port, config.host, () => {
  console.log(`[gator] listening on ${config.host}:${config.port}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close());
}
