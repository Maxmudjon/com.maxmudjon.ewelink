let WebSocket = require("ws");
let request = require("request-json");
let nonce = require("nonce")();
const querystring = require("querystring");
const EventEmitter = require("events");
const Homey = require("homey");

class Ewelink extends EventEmitter {
  constructor(log) {
    super();
    this.setMaxListeners(150);
    this.log = log;
    this.log("Ewelink initialized!");
    this.authenticationToken;
    this.apiHost = "eu-api.coolkit.cc:8080";
    this.apiKey;
    this.webSocketApi = "eu-pconnect1.coolkit.cc";
    this.isSocketOpen = false;

    if (Homey.ManagerSettings.get("account")) {
      this.connect();
    }
  }

  validateEmail(login) {
    var mailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let phoneFormat = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

    if (mailFormat.test(login)) {
      return "mail";
    } else if (phoneFormat.test(login)) {
      return "phone";
    } else {
      return false;
    }
  }

  imeiGen() {
    var pos;
    var str = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    var sum = 0;
    var final_digit = 0;
    var t = 0;
    var len_offset = 0;
    var len = 15;
    var issuer;

    var rbi = ["01", "10", "30", "33", "35", "44", "45", "49", "50", "51", "52", "53", "54", "86", "91", "98", "99"];
    var arr = rbi[Math.floor(Math.random() * rbi.length)].split("");
    str[0] = Number(arr[0]);
    str[1] = Number(arr[1]);
    pos = 2;

    while (pos < len - 1) {
      str[pos++] = Math.floor(Math.random() * 10) % 10;
    }

    len_offset = (len + 1) % 2;
    for (pos = 0; pos < len - 1; pos++) {
      if ((pos + len_offset) % 2) {
        t = str[pos] * 2;
        if (t > 9) {
          t -= 9;
        }
        sum += t;
      } else {
        sum += str[pos];
      }
    }

    final_digit = (10 - (sum % 10)) % 10;
    str[len - 1] = final_digit;
    t = str.join("");
    t = t.substr(0, len);

    return t;
  }

  connect() {
    let account = Homey.ManagerSettings.get("account") || null;
    this.login = account.login;
    this.password = account.password;
    this.imei = account.imei || this.imeiGen();
    console.log("TCL: Ewelink -> connect -> this.imei", this.imei);
    let data = {};
    if (this.validateEmail(this.login) == "phone") {
      data.phoneNumber = this.login;
    } else if (this.validateEmail(this.login) == "mail") {
      data.email = this.login;
    } else {
      return;
    }
    data.password = this.password;
    data.version = "6";
    data.ts = "" + Math.floor(new Date().getTime() / 1000);
    data.nonce = "" + nonce();
    data.appid = "oeVkj2lYFGnJu5XUtWisfW4utiN4u9Mq";
    data.imei = this.imei;
    data.os = "iOS";
    data.model = "iPhone10,6";
    data.romVersion = "11.1.2";
    data.appVersion = "3.5.3";

    let json = JSON.stringify(data);
    this.log("Sending login request with user credentials: ", json);

    let decryptedAppSecret = "6Nz4n0xA8s8qdxQf2GqurZj2Fs55FUvM";
    let sign = require("crypto")
      .createHmac("sha256", decryptedAppSecret)
      .update(json)
      .digest("base64");
    this.log("Login signature: ", sign);

    let webClient = request.createClient("https://" + this.apiHost);
    webClient.headers["Authorization"] = "Sign " + sign;
    webClient.headers["Content-Type"] = "application/json;charset=UTF-8";
    webClient.post("/api/user/login", data, (err, res, body) => {
      if (err) {
        this.log("An error was encountered while logging in. Error was ", err);

        return;
      }

      if (body.hasOwnProperty("error") && body.error == 301 && body.hasOwnProperty("region")) {
        let idx = this.apiHost.indexOf("-");
        if (idx == -1) {
          this.log("Received new region " + body.region + " However we cannot construct the new API host url.");

          return;
        }
        let newApiHost = body.region + this.apiHost.substring(idx);
        if (this.apiHost != newApiHost) {
          this.log("Received new region " + body.region + " updating API host to " + newApiHost);
          this.apiHost = newApiHost;
          this.connect();
          return;
        }
      }

      if (!body.at) {
        let response = JSON.stringify(body);
        this.log("Server did not response with an authentication token. Response was ", response);
        return;
      }

      this.log("Authentication token received ", body.at);
      this.authenticationToken = body.at;
      this.webClient = request.createClient("https://" + this.apiHost);
      this.webClient.headers["Authorization"] = "Bearer " + body.at;

      this.getWebSocketHost();
    });
  }

  getArguments() {
    let args = {};
    args.lang = "en";
    args.apiKey = this.apiKey;
    args.getTags = "1";
    args.version = "6";
    args.ts = "" + Math.floor(new Date().getTime() / 1000);
    args.nounce = "" + nonce();
    args.appid = "oeVkj2lYFGnJu5XUtWisfW4utiN4u9Mq";
    args.imei = this.imei;
    args.os = "iOS";
    args.model = "iPhone10,6";
    args.romVersion = "11.1.2";
    args.appVersion = "3.5.3";
    return querystring.stringify(args);
  }

  getWebSocketHost() {
    var data = {};
    data.accept = "mqtt,ws";
    data.version = "6";
    data.ts = "" + Math.floor(new Date().getTime() / 1000);
    data.nonce = "" + nonce();
    data.appid = "oeVkj2lYFGnJu5XUtWisfW4utiN4u9Mq";
    data.imei = this.imei;
    data.os = "iOS";
    data.model = "iPhone9,1";
    data.romVersion = "13";
    data.appVersion = "3.5.3";

    let webClient = request.createClient("https://" + this.apiHost.replace("-api", "-disp"));
    webClient.headers["Authorization"] = "Bearer " + this.authenticationToken;
    webClient.headers["Content-Type"] = "application/json;charset=UTF-8";
    webClient.post("/dispatch/app", data, (err, res, body) => {
      if (err) {
        this.log("An error was encountered while getting websocket host. Error was ", err);
        return;
      }

      if (!body.domain) {
        let response = JSON.stringify(body);
        this.log("Server did not response with a websocket host. Response was ", response);
        return;
      }

      this.log("WebSocket host received ", body.domain);
      this.webSocketApi = body.domain;
      if (this.wsc) {
        this.wsc.url = "wss://" + body.domain + ":8080/api/ws";
      }

      let url = "https://" + this.apiHost;
      this.log("Requesting a list of devices from eWeLink HTTPS API at ", url);
      this.webClient = request.createClient(url);
      this.webClient.headers["Authorization"] = "Bearer " + this.authenticationToken;
      this.webClient.get("/api/user/device?" + this.getArguments(), (err, res, body) => {
        if (err) {
          this.log("An error was encountered while requesting a list of devices. Error was ", err);
          return;
        } else if (!body || (body.hasOwnProperty("error") && body.devicelist.length == 0)) {
          let response = JSON.stringify(body);

          this.log("An error was encountered while requesting a list of devices. Response was ", response);

          if (body && body.error === "401") {
            this.log("Verify that you have the correct authenticationToken specified in your configuration. The currently-configured token is ", platform.authenticationToken);
          }

          return;
        }

        let size = Object.keys(body.devicelist).length;
        this.log("eWeLink HTTPS API reports that there are a total of " + size + " devices registered");

        if (size === 0) {
          this.log("As there were no devices were found, all devices have been removed from the platorm's cache. Please regiester your devices using the eWeLink app and restart HomeBridge");
        }

        body.devicelist.forEach(device => {
          this.apiKey = device.apikey;
          // this.log(device);
        });

        this.log("API key retrieved from web service is ", this.apiKey);

        let url = "wss://" + this.webSocketApi + ":8080/api/ws";
        this.wsc = new WebSocketClient();
        this.wsc.open(url);
        this.wsc.onmessage = message => {
          if (message == "pong") {
            return;
          }

          this.log("WebSocket messge received: ", message);

          let json;
          try {
            json = JSON.parse(message);
          } catch (e) {
            return;
          }

          this.emit(`${json.deviceid}`, json);
        };

        this.wsc.onopen = e => {
          this.isSocketOpen = true;
          let time_stamp = new Date() / 1000;
          let timeStamp = Math.floor(time_stamp);

          let payload = {};
          payload.action = "userOnline";
          payload.userAgent = "app";
          payload.version = 6;
          payload.nonce = "" + nonce();
          payload.apkVesrion = "1.8";
          payload.os = "ios";
          payload.at = this.authenticationToken;
          payload.apikey = this.apiKey;
          payload.ts = "" + timeStamp;
          payload.model = "iPhone10,6";
          payload.romVersion = "11.1.2";
          payload.sequence = this.getSequence();

          let string = JSON.stringify(payload);

          this.log("Sending login request ", string);

          this.wsc.send(string);
        };

        this.wsc.onclose = e => {
          this.log("WebSocket was closed. Reason [%s]", e);
          this.isSocketOpen = false;
        };
      });
    });
  }

  destroy() {
    if (this.wsc) {
      this.wsc.terminate();
      this.wsc = null;
    }
  }

  getSequence() {
    let time_stamp = new Date() / 1000;
    this.sequence = Math.floor(time_stamp * 1000);
    return this.sequence;
  }

  getDevices(model) {
    let url = "https://" + this.apiHost;
    this.log("Requesting a list of devices from eWeLink HTTPS API at ", url);
    this.webClient = request.createClient(url);
    this.webClient.headers["Authorization"] = "Bearer " + this.authenticationToken;
    return new Promise((resolve, reject) => {
      this.webClient.get("/api/user/device?" + this.getArguments(), (err, res, devices) => {
        if (err) {
          reject(err);
        }
        // this.log("Devices: ", devices);
        if (devices.error == 401 || devices.error == 400) {
          if (Homey.ManagerSettings.get("account") == null) {
            reject("Please signin from app settings");
          } else resolve(devices);
        }
        if (devices && devices.length >= 0) {
          resolve(devices);
        }
      });
    });
  }

  getAllDevices(signData) {
    this.log("getAllDevices funtion: ", signData);
    return new Promise((resolve, reject) => {
      let data = {
        password: signData.body.password,
        version: "6",
        ts: "" + Math.floor(new Date().getTime() / 1000),
        nonce: "" + nonce(),
        appid: "oeVkj2lYFGnJu5XUtWisfW4utiN4u9Mq",
        imei: signData.body.imei,
        os: "iOS",
        model: "iPhone9,1",
        romVersion: "13",
        appVersion: "3.5.3"
      };

      if (this.validateEmail(signData.body.login) == "phone") {
        data.phoneNumber = signData.body.login;
      } else if (this.validateEmail(signData.body.login) == "mail") {
        data.email = signData.body.login;
      } else {
        return;
      }

      let json = JSON.stringify(data);
      let decryptedAppSecret = "6Nz4n0xA8s8qdxQf2GqurZj2Fs55FUvM";
      let sign = require("crypto")
        .createHmac("sha256", decryptedAppSecret)
        .update(json)
        .digest("base64");

      let webClient = request.createClient("https://" + this.apiHost);
      webClient.headers["Authorization"] = "Sign " + sign;
      webClient.headers["Content-Type"] = "application/json;charset=UTF-8";
      webClient.post("/api/user/login", data, (error, res, body) => {
        if (error) {
          this.log("Login error: ", error);
          reject(error);
        }

        if (body.error === 401) {
          resolve({
            error: body,
            status: "error",
            msg: "Login or Password incorrect"
          });
          return;
        }

        this.authenticationToken = body.at;
        this.webClient = request.createClient("https://" + this.apiHost);
        this.webClient.headers["Authorization"] = "Bearer " + this.authenticationToken;

        this.webClient.get("/api/user/device?" + this.getArguments(), (error, res, devices) => {
          console.log("TCL: Ewelink -> getAllDevices -> devices", devices);
          if (error) {
            reject(error);
          }

          resolve(devices);
        });
      });
    });
  }

  getDevice(deviceid) {
    let url = "https://" + this.apiHost;
    this.webClient = request.createClient(url);
    this.webClient.headers["Authorization"] = "Bearer " + this.authenticationToken;
    return new Promise((resolve, reject) => {
      this.webClient.get("/api/user/device/" + deviceid + "?" + this.getArguments(), (err, res, device) => {
        if (err) {
          reject(err);
        }
        resolve(device);
      });
    });
  }

  setPowerState(device, value) {
    let options = {};
    options.protocolVersion = 13;

    let payload = {};
    payload.action = "update";
    payload.userAgent = "app";
    payload.params = {};
    payload.params.switch = value ? "on" : "off";
    payload.apikey = "" + device.apikey;
    payload.deviceid = "" + device.deviceid;
    payload.sequence = this.getSequence();

    let string = JSON.stringify(payload);
    // this.log("setPowerState -> string", string);

    return new Promise((resolve, reject) => {
      if (this.isSocketOpen) {
        setTimeout(() => {
          this.wsc.send(string);
          resolve();
        }, 1);
      } else {
        reject("Socket was closed. It will reconnect automatically. Please retry your command");
      }
    });
  }

  setPower2State(device, channels) {
    let options = {};
    options.protocolVersion = 13;

    let payload = {};
    payload.action = "update";
    payload.userAgent = "app";
    payload.params = {};
    payload.params.switches = channels;
    payload.apikey = "" + device.apikey;
    payload.deviceid = "" + device.deviceid;
    payload.sequence = this.getSequence();

    let string = JSON.stringify(payload);
    this.log("setPower2State -> string", string);

    return new Promise((resolve, reject) => {
      if (this.isSocketOpen) {
        setTimeout(() => {
          this.wsc.send(string);
          resolve();
        }, 1);
      } else {
        reject("Socket was closed. It will reconnect automatically. Please retry your command");
      }
    });
  }

  setParams(device, params) {
    let options = {};
    options.protocolVersion = 13;

    let payload = {};
    payload.action = "update";
    payload.userAgent = "app";
    payload.params = params;
    payload.apikey = "" + device.apikey;
    payload.deviceid = "" + device.deviceid;
    payload.sequence = this.getSequence();

    let string = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      if (this.isSocketOpen) {
        setTimeout(() => {
          this.wsc.send(string);
          resolve();
        }, 1);
      } else {
        reject("Socket was closed. It will reconnect automatically. Please retry your command");
      }
    });
  }
}

class WebSocketClient {
  constructor() {
    this.number = 0;
    this.autoReconnectInterval = 5 * 1000;
    this.pendingReconnect = false;
  }

  open(url) {
    this.url = url;
    this.instance = new WebSocket(this.url);
    this.instance.on("open", () => {
      this.onopen();
    });

    this.instance.on("message", (data, flags) => {
      this.number++;
      this.onmessage(data, flags, this.number);
    });

    this.instance.on("close", e => {
      switch (e) {
        case 1000:
          this.log("WebSocket closed");
          break;
        default:
          this.reconnect(e);
          break;
      }
      this.onclose(e);
    });
    this.instance.on("error", e => {
      switch (e.code) {
        case "ECONNREFUSED":
          this.reconnect(e);
          break;
        default:
          this.onerror(e);
          break;
      }
    });
  }

  send(data, option) {
    try {
      this.instance.send(data, option);
    } catch (e) {
      this.instance.emit("error", e);
    }
  }

  reconnect(e) {
    if (this.pendingReconnect) return;
    this.pendingReconnect = true;

    this.instance.removeAllListeners();

    let platform = this;
    setTimeout(() => {
      platform.pendingReconnect = false;
      console.log("WebSocketClient: reconnecting...");
      platform.open(platform.url);
    }, this.autoReconnectInterval);
  }

  terminate() {
    this.instance.removeAllListeners();
    this.instance.terminate();
  }

  onopen(e) {}
  onmessage(data, flags, number) {}
  onerror(e) {}
  onclose(e) {}
}

module.exports = Ewelink;
