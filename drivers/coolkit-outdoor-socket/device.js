"use strict";

const Homey = require("homey");

class CoolKitOutdoorSocket extends Homey.Device {
	onInit() {
		this.log("Coolkit Outdoor Socket has been inited");
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
		clearInterval(this.interval);
		this.interval = setInterval(() => {
			Homey.app.ewelinkApi
				.getDevices("PS-16")
				.then(device => {
					let someDevice = device.filter(device => device.deviceid === this.data.deviceid);
					if (someDevice[0].online) {
						this.setAvailable();
						this.setSettings({
							brandName: someDevice[0].brandName,
							model: someDevice[0].productModel,
							ip: someDevice[0].ip,
							fwVersion: someDevice[0].fwVersion
						}).catch(error => this.log(error));
					} else {
						this.setUnavailable(Homey.__("Device offline"));
					}
				})
				.catch(error => this.log(error));
		}, 60 * 60 * 1000);
		if (device.params) {
			if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
			if (device.params.switch == "off") this.updateCapabilityValue("onoff", false);
			if (device.brandName)
				this.setSettings({
					brandName: device.brandName,
					model: device.productModel,
					ip: device.ip,
					fwVersion: device.params.fwVersion
				}).catch(error => this.log(error));
		}
	}

	updateCapabilityValue(name, value) {
		if (this.getCapabilityValue(name) != value) {
			this.setCapabilityValue(name, value)
				.then(() => {
					this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
				})
				.catch(error => {
					this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
				});
		}
	}

	registerToggle(name) {
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

module.exports = CoolKitOutdoorSocket;
