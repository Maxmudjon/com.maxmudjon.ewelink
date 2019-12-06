"use strict";

const Homey = require("homey");

class Sonoff4CHPro extends Homey.Device {
  onInit() {
    this.log("Sonoff Basic has been inited");
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
    this.registerChannelToggle("onoff");
    this.registerChannelToggle("onoff.1");
    this.registerChannelToggle("onoff.2");
    this.registerChannelToggle("onoff.3");
    this.saving = false;
  }

  handleStateChange(device) {
    console.log("TCL: Sonoff4CHPro -> handleStateChange -> device", device);
    if (device.params) {
      if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.startup && !this.saving)
        this.setSettings({
          powerResponse: device.params.startup
        });
      if (device.params.sledOnline && !this.saving)
        this.setSettings({
          networkLed: device.params.sledOnline
        });
      if (device.params.pulse && !this.saving)
        this.setSettings({
          duration: device.params.pulse
        });
      if (device.params.pulseWidth && !this.saving)
        this.setSettings({
          durationLimit: parseFloat(device.params.pulseWidth / 1000)
        });
    }

    if (device.hasOwnProperty("online")) {
      if (device.online) this.setAvailable();
      else this.setUnavailable("Device is offline");
    }

    if (device.hasOwnProperty("action")) {
      if (device.params.online) this.setAvailable();
      else if (!device.params.online) this.setUnavailable("Device is offline");
    }
  }

  async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
    this.saving = true;
    let params = {
      startup: newSettingsObj.powerResponse,
      sledOnline: newSettingsObj.networkLed,
      pulse: newSettingsObj.duration,
      pulseWidth: newSettingsObj.durationLimit * 1000
    };

    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };

    Homey.app.ewelinkApi.setParams(data, params).then(() => {
      this.saving = false;
      callback(null, true);
    });
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value);
    }
  }

  registerChannelToggle(name, trigger) {
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      let channels = [{ outlet: 0, switch: "on" }, { outlet: 1, switch: "on" }, { outlet: 2, switch: "on" }, { outlet: 3, switch: "on" }];
      if (name == "onoff") {
        channels[0].switch = value ? "on" : "off";
        channels[1].switch = this.getCapabilityValue("onoff.1") ? "on" : "off";
        channels[2].switch = this.getCapabilityValue("onoff.2") ? "on" : "off";
        channels[3].switch = this.getCapabilityValue("onoff.3") ? "on" : "off";
      } else if (name == "onoff.1") {
        channels[0].switch = this.getCapabilityValue("onoff") ? "on" : "off";
        channels[1].switch = value ? "on" : "off";
        channels[2].switch = this.getCapabilityValue("onoff.2") ? "on" : "off";
        channels[3].switch = this.getCapabilityValue("onoff.3") ? "on" : "off";
      } else if (name == "onoff.2") {
        channels[0].switch = this.getCapabilityValue("onoff") ? "on" : "off";
        channels[1].switch = this.getCapabilityValue("onoff.1") ? "on" : "off";
        channels[2].switch = value ? "on" : "off";
        channels[3].switch = this.getCapabilityValue("onoff.3") ? "on" : "off";
      } else if (name == "onoff.3") {
        channels[0].switch = this.getCapabilityValue("onoff") ? "on" : "off";
        channels[1].switch = this.getCapabilityValue("onoff.1") ? "on" : "off";
        channels[2].switch = this.getCapabilityValue("onoff.2") ? "on" : "off";
        channels[3].switch = value ? "on" : "off";
      }

      Homey.app.ewelinkApi.setPower2State(data, channels);
      console.log("[INFO]: SonoffT12C -> registerToggle -> data" + data + " CAPAB " + name + " Channels " + JSON.stringify(channels));
    });
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(`${this.data.deviceid}`, event => this.handleStateChange(event));
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(`${this.data.deviceid}`, event => this.handleStateChange(event));
  }
}

module.exports = Sonoff4CHPro;
