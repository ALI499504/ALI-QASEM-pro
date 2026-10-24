var express = require("express"),
  morgan = require("morgan"),
  passport = require("passport"),
  cors = require("cors"),
  methodOverride = require("method-override"),
  path = require("path"),
  // rateLimiter = require("./middlewares/rateLimiter"),
  routers = require("./routers");

module.exports = () => {

  var app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({
    limit: "1mb",
    extended: true
  }));
  // app.use(bodyParser.json({ limit: "1mb" }));
  // app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));
  app.use(cors());
  app.use(morgan("dev"));
  // app.use(rateLimiter);
  // morgan.token('ip', (req) => {
  //     console.log("Ip adress =>>>>>", req.socket.remoteAddress)
  //     return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // });

  // app.use(morgan(':ip - :method :url :status :res[content-length] - :response-time ms'));
  app.use(methodOverride());

  app.use(passport.initialize());

  // Serve static frontend
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'bfx-trade-copier', timestamp: new Date().toISOString() });
  });

  routers.map(router => {
    app.use(`/api/${router}`, require(`../routers/${router}.router`));
  });

  return app;
}