"use strict";

const Homey = require("homey");

class Sonoff4CHPro extends Homey.Device {
  onInit() {
    this.log("Sonoff Basic has been inited");
    this.driver = this.getDriver();
    this.data = this.getData();
    const { actions } = this.driver;
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerChannelToggle("onoff");
    this.registerChannelToggle("onoff.1");
    this.registerChannelToggle("onoff.2");
    this.registerChannelToggle("onoff.3");
    this.registerToggleAction("onoff.1", actions.secondChannelOn);
    this.registerToggleAction("onoff.1", actions.secondChannelOff);
    this.registerToggleAction("onoff.1", actions.secondChannelToggle);
    this.registerToggleAction("onoff.2", actions.threeChannelOn);
    this.registerToggleAction("onoff.2", actions.threeChannelOff);
    this.registerToggleAction("onoff.2", actions.threeChannelToggle);
    this.registerToggleAction("onoff.3", actions.fourChannelOn);
    this.registerToggleAction("onoff.3", actions.fourChannelOff);
    this.registerToggleAction("onoff.3", actions.fourChannelToggle);
  }

  handleStateChange(device) {
    if (device.params && device.params.online == true) this.setAvailable();
    if (device.params && device.params.online == false) this.setUnavailable();

    if (device.params && device.params.switches) {
      if (device.params.switches[0].switch == "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switches[0].switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.switches[1].switch == "on") this.updateCapabilityValue("onoff.1", true);
      if (device.params.switches[1].switch == "off") this.updateCapabilityValue("onoff.1", false);
      if (device.params.switches[2].switch == "on") this.updateCapabilityValue("onoff.2", true);
      if (device.params.switches[2].switch == "off") this.updateCapabilityValue("onoff.2", false);
      if (device.params.switches[3].switch == "on") this.updateCapabilityValue("onoff.3", true);
      if (device.params.switches[3].switch == "off") this.updateCapabilityValue("onoff.3", false);
    }

    if (device.params.updateSource == "LAN") this.setStoreValue("api", "lan");
    if (device.params.updateSource == "WS") this.setStoreValue("api", "ws");

    if (device.params.startup)
      this.setSettings({
        powerResponse: device.params.startup,
      });

    if (device.params.sledOnline)
      this.setSettings({
        networkLed: device.params.sledOnline,
      });

    if (device.params.pulse)
      this.setSettings({
        duration: device.params.pulse,
      });

    if (device.params.pulseWidth)
      this.setSettings({
        durationLimit: parseFloat(device.params.pulseWidth / 1000),
      });
  }

  async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
    let data = {
      name: this.getName(),
      deviceid: this.data.deviceid,
      apikey: this.data.apikey,
      uiid: this.data.uiid,
      api: "ws",
    };

    Homey.app.ewelinkApi.sendDeviceUpdate(data, {
      startup: newSettingsObj.powerResponse,
      sledOnline: newSettingsObj.networkLed,
      pulse: newSettingsObj.duration,
      pulseWidth: newSettingsObj.durationLimit * 1000,
    });
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  registerChannelToggle(name, trigger) {
    let data = {
      name: this.getName(),
      deviceid: this.data.deviceid,
      apikey: this.data.apikey,
      uiid: this.data.uiid,
      api: "ws",
    };
    this.registerCapabilityListener(name, async (value) => {
      let switches = [
        { outlet: 0, switch: this.getCapabilityValue("onoff") ? "on" : "off" },
        { outlet: 1, switch: this.getCapabilityValue("onoff.1") ? "on" : "off" },
        { outlet: 2, switch: this.getCapabilityValue("onoff.2") ? "on" : "off" },
        { outlet: 3, switch: this.getCapabilityValue("onoff.3") ? "on" : "off" },
      ];
      if (name == "onoff") {
        switches[0].switch = value ? "on" : "off";
      } else if (name == "onoff.1") {
        switches[1].switch = value ? "on" : "off";
      } else if (name == "onoff.2") {
        switches[2].switch = value ? "on" : "off";
      } else if (name == "onoff.3") {
        switches[3].switch = value ? "on" : "off";
      }

      Homey.app.ewelinkApi.sendDeviceUpdate(data, { switches });
    });
  }

  registerToggleAction(name, action) {
    action.registerRunListener(async (args, state) => {
      let data = {
        name: this.getName(),
        deviceid: args.device.data.deviceid,
        apikey: args.device.data.apikey,
        uiid: this.data.uiid,
        api: "ws",
      };
      let switches = [
        { outlet: 0, switch: args.device.getCapabilityValue("onoff") ? "on" : "off" },
        { outlet: 1, switch: args.device.getCapabilityValue("onoff.1") ? "on" : "off" },
        { outlet: 2, switch: args.device.getCapabilityValue("onoff.2") ? "on" : "off" },
        { outlet: 3, switch: args.device.getCapabilityValue("onoff.3") ? "on" : "off" },
      ];
      if (name == "onoff.1") {
        if (action.id == "secondChannelOn") {
          switches[1].switch = "on";
        } else if (action.id == "secondChannelOff") {
          switches[1].switch = "off";
        } else if (action.id == "secondChannelToggle") {
          switches[1].switch = "toggle";
        }
      } else if (name == "onoff.2") {
        if (action.id == "threeChannelOn") {
          switches[2].switch = "on";
        } else if (action.id == "threeChannelOff") {
          switches[2].switch = "off";
        } else if (action.id == "threeChannelToggle") {
          switches[2].switch = "toggle";
        }
      } else if (name == "onoff.3") {
        if (action.id == "fourChannelOn") {
          switches[3].switch = "on";
        } else if (action.id == "fourChannelOff") {
          switches[3].switch = "off";
        } else if (action.id == "fourChannelToggle") {
          switches[3].switch = "toggle";
        }
      }

      Homey.app.ewelinkApi.sendDeviceUpdate(data, { switches });
      return true;
    });
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(this.data.deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(this.data.deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = Sonoff4CHPro;
