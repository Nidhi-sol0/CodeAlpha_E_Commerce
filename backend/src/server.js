const app = require("./app");
const connectDatabase = require("./config/database");
const config = require("./config/env");

async function startServer() {
  try {
    await connectDatabase();
    app.listen(config.port, () => {
      console.info(`LumaCart API listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Unable to start LumaCart API:", error.message);
    process.exitCode = 1;
  }
}

startServer();