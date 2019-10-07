"use strict";

const Homey = require("homey");
const model = "TH16";


class SonoffTH16 extends Homey.Device {
  onInit() {
    this.log("Sonoff TH16 has been inited");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerToggle("onoff");
  }

  handleStateChange(device) {
    console.log("[INFO]: SonoffTH16 -> handleStateChange -> device", device);

    if (device.params) {
      if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.currentTemperature) this.updateCapabilityValue("measure_temperature", parseInt(device.params.currentTemperature));
      if (device.params.currentHumidity) this.updateCapabilityValue("measure_humidity", parseInt(device.params.currentHumidity));
      if (device.params.sensorType) this.setSettings({
        sensorType: device.params.sensorType
      });

      if (device.params.deviceType == "temperature") {
        this.setSettings({
          thermostatMode: 'temperature',
          targetHighTemperature: parseInt(device.params.targets[0].targetHigh),
          highTemperatureThreshold: device.params.targets[0].reaction.switch,
          targetLowTemperature: parseInt(device.params.targets[1].targetLow),
          lowTemperatureThreshold: device.params.targets[1].reaction.switch
        })
      } else if (device.params.deviceType == "humidity") {
        this.setSettings({
          thermostatMode: 'humidity',
          targetHighHumidity: device.params.targets[0].targetHigh,
          highTemperatureThreshold: parseInt(device.params.targets[0].reaction.switch),
          targetLowHumidity: parseInt(device.params.targets[1].targetLow),
          lowHumidityThreshold: device.params.targets[1].reaction.switch
        });
      } else if (device.params.deviceType == "normal") {
        this.setSettings({
          thermostatMode: 'off'
        });
      }
    }


  }

  async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
    if (changedKeysArr) {
      if (changedKeysArr.includes("thermostatMode")) {
        this.log('Thermostat mode changed to: ', newSettingsObj.thermostatMode)
        let data = {
          deviceid: this.data.deviceid,
          apikey: this.data.apikey
        };
        Homey.app.ewelinkApi.setParams(data, { deviceType: newSettingsObj.thermostatMode });
      }

      if (changedKeysArr.includes("targetHighTemperature")) {
        this.log('Thermostat mode changed to: ', newSettingsObj.targetHighTemperature)
        let data = {
          deviceid: this.data.deviceid,
          apikey: this.data.apikey
        };
        Homey.app.ewelinkApi.setParams(data, { deviceType: newSettingsObj.thermostatMode });
      }
    }
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value);
    }
  }

  registerToggle(name, trigger) {
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      Homey.app.ewelinkApi.setPowerState(data, value);
    });
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(`${this.data.deviceid}`, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(`${this.data.deviceid}`, this.handleStateChange);
  }
}

module.exports = SonoffTH16;
