const EventEmitter = require("events");
const Homey = require("homey");
const eWeLinkHTTP = require("./http");
const eWeLinkLAN = require("./lan");
const eWeLinkWS = require("./ws");
const util = require("./util");
const promInterval = require("interval-promise");
const Rollbar = require("rollbar");
const appJSON = require("../app.json");

class Ewelink extends EventEmitter {
  constructor(log) {
    super();
    this.setMaxListeners(150);
    this.log = log;
    this.log("Ewelink initialized!");
    this.debug = false;
    this.devicesInHomey = new Map();
    this.devicesInEwelink = new Map();
    this.wsRefreshFlag = true;
    this.sendDeviceUpdate = this.sendDeviceUpdate.bind(this);
    this.connect = this.connect.bind(this);
    this.rollbar = new Rollbar({
      accessToken: "968df07261cd43fa994e11f678f3dc7a",
      captureUncaught: true,
      captureUnhandledRejections: true
    });

    if (Homey.ManagerSettings.get("account")) {
      this.connect();
    }
  }

  async connect() {
    try {
      let account = Homey.ManagerSettings.get("account");
      if (account.countryCode == null || account.countryCode == undefined) return new Error("Country code not indicated!");

      const config = {
        username: account.login,
        password: account.password,
        countryCode: account.countryCode,
        ipOverride: [],
        debug: false,
        debugReqRes: false
      };

      this.httpClient = new eWeLinkHTTP(config, this.log);
      await this.httpClient.getHost();
      this.authData = await this.httpClient.login();
      const deviceList = await this.httpClient.getDevices();
      deviceList.forEach(device => this.devicesInEwelink.set(device.deviceid, device));
      // this.log("deviceList", JSON.stringify(deviceList, null, 2));
      this.rollbar.info(JSON.stringify({ appVersion: appJSON.version, deviceList }, null, 2));
      this.wsClient = new eWeLinkWS(config, this.log, this.authData);
      await this.wsClient.getHost();
      this.wsClient.login();
      this.lanClient = new eWeLinkLAN(config, this.log, deviceList);
      const lanDevices = await this.lanClient.getHosts();

      await this.lanClient.startMonitor();

      deviceList.forEach(device => {
        this.wsClient.requestUpdate(device);
      });

      this.wsClient.receiveUpdate(d => this.receiveDeviceUpdate(d));
      this.lanClient.receiveUpdate(d => this.receiveDeviceUpdate(d));
      this.wsRefresh = promInterval(
        async () => {
          if (this.wsRefreshFlag) {
            try {
              if (this.wsClient) {
                await this.wsClient.getHost();
                await this.wsClient.closeConnection();
                await util.sleep(250);
                await this.wsClient.login();
              }
            } catch (err) {
              this.log(this.debug ? err : err.message);
            }
          }
        },
        1800000,
        { stopOnError: false }
      );

      this.log("API succesfuly started");
    } catch (error) {
      this.log(error);
    }
  }

  receiveDeviceUpdate(device) {
    this.emit(device.deviceid, device);
  }

  sign(signData) {
    return new Promise(async (resolve, reject) => {
      try {
        const config = {
          username: signData.body.login,
          password: signData.body.password,
          countryCode: signData.body.countryCode
        };

        this.httpClient = new eWeLinkHTTP(config, this.log);
        await this.httpClient.getHost();
        this.authData = await this.httpClient.login();
        const deviceList = await this.httpClient.getDevices();
        resolve({ status: "ok", deviceList });
      } catch (error) {
        reject({ status: "error", msg: error.message });
      }
    });
  }

  async getDevices() {
    return await this.httpClient.getDevices();
  }

  eWeLinkShutdown() {
    try {
      if (this.lanClient) this.lanClient.closeConnection();
      if (this.wsClient) this.wsClient.closeConnection();
    } catch (err) {
      this.log(this.debug ? err : err.message);
    }
    this.wsRefreshFlag = false;
  }

  async sendDeviceUpdate(device, params) {
    await util.sleep(Math.floor(Math.random() * (100 - 10 + 1) + 10));
    if (this.updateInProgress) {
      await util.sleep(400);
      return await this.sendDeviceUpdate(device, params);
    }
    this.updateInProgress = true;
    setTimeout(() => (this.updateInProgress = false), 350);

    const payload = {
      apikey: device.apikey,
      deviceid: device.deviceid,
      params
    };

    const res = util.devicesNonLAN.includes(device.uiid) ? "LAN mode is not supported for this device" : await this.lanClient.sendUpdate(payload);

    if (res !== "ok") {
      if (device.api == "ws") {
        if (this.debug) this.log("[%s] Reverting to web socket as %s.", device.name, res);
        await this.wsClient.sendUpdate(payload);
      } else {
        throw new Error("it is unreachable. It's status will be corrected once it is reachable");
      }
    }
  }
}

module.exports = Ewelink;
