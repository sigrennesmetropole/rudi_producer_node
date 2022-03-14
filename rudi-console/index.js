/**
 * Code for the node server to serve the web page that
 * allow the user to update rudi metadata
 * Listen on the port 3038
 * @author Forian Desmortreux
 */

/* ----- INITALIZE VARIABLES AND CONSTANTS ----- */
const express = require("express");
const path = require("path");
var hashId = "";

const config = (function () {
  let myArgs = process.argv;
  var config;
  try {
    config = require("./custom_config.json");
  } catch {
    config = require("./default_config.json");
  }
  let index = 0;
  while (index < myArgs.length) {
    if (index + 1 < myArgs.length) {
      if (myArgs[index] == "--revision") {
        index++;
        hashId = myArgs[index];
      } else if (myArgs[index] == "--config") {
        index++;
        var local_config = require(myArgs[index]);
        try {
          for (let prop in local_config) {
            config[prop] = local_config[prop];
          }
        } catch (e) {
          throw "Error with config file";
        }
      }
    }
    index++;
  }
  if (hashId == "")
    try {
      hashId = require("child_process").execSync("git rev-parse --short HEAD");
    } catch (e) {
      /* Ignore.*/
    }
  return config;
})();

console.log(new Date().toISOString());
console.log("Config :\n", config);

/* ----- EXPRESS ----- */

// Routing

const app = express();
app.use(express.static(__dirname + "/public"));

// Main route
app.get("/config.json", (req, res) => {
  console.log("Serving config...");
  res.send(JSON.stringify(config));
});

// Main route
app.get("/", function (req, res) {
  console.log("main path");
  res.sendFile(path.join(__dirname + "/public/rudi.html"));
});

app.get("/contacts", function (req, res) {
  console.log("main path");
  res.sendFile(path.join(__dirname + "/public/contact.html"));
});

app.get("/organizations", function (req, res) {
  console.log("main path");
  res.sendFile(path.join(__dirname + "/public/organization.html"));
});

// Test
app.get("/test_page", function (req, res) {
  console.log("main path");
  res.sendFile(path.join(__dirname + "/public/test_page.html"));
});

// Get commit id;
app.get("/commitID", function (req, res) {
  res.setHeader("Content-type", "text");
  res.send(hashId);
});

app.get("/getTemplate/:filename", function (req, res) {
  var x = req.params;
  console.log("getTemplate", x.filename);
  let template;
  try {
    template = require(path.join(__dirname + "/templates/" + x.filename));
  } catch {
    res.send("Not found");
  }
  res.send(JSON.stringify(template));
});

// Start node serveur
// 0.0.0.0 for all interfaces - allow forwarding to rudi
let server = app.listen(config.port, config.host, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("App listening at %s:%s", host, port);
});
