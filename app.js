"use strict";

const Homey = require("homey");
const EwelinkApi = require("./lib/index");
const { ManagerSettings } = Homey;

class Ewelink extends Homey.App {
  onInit() {
    this.log("Ewelink is running...");
    this.ewelinkApi = new EwelinkApi(this.log);
    this.onSettingsChanged = this.onSettingsChanged.bind(this);
    ManagerSettings.on("set", this.onSettingsChanged);
    ManagerSettings.on("unset", this.onSettingsChanged);
  }

  onSettingsChanged(key) {
    switch (key) {
      case "account":
        this.ewelinkApi.eWeLinkShutdown();
        this.ewelinkApi.connect();
        break;
      default:
        break;
    }
  }

  sign(signData) {
    return Homey.app.ewelinkApi.sign(signData);
  }

  getDevices(signData) {
    return Homey.app.ewelinkApi.getAllDevices(signData);
  }
}

module.exports = Ewelink;
