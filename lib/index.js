/**
 * Created by Philip Smith on 2/5/2017.
 */
const Promise = require('bluebird');
const Telnet = require('telnet-client');
const events = require('events');
const _ = require('lodash');

let connection = false;

module.exports = class TelnetVPN extends events.EventEmitter {
	constructor() {
		super();
		let vpn = this;
		connection = new Telnet();
		connection.on('connect', function () {
			vpn.emit('connect');
		});
		connection.on('error', function (error) {
			vpn.disconnect();
			vpn.emit('error', error);
		});
		connection.on('end', function () {
			vpn.emit('end');
		});
		connection.on('close', function () {
			vpn.emit('close');
		});
	}

	// Connect To VPN through Telnet
	connect(options) {
		return new Promise(function (resolve) {
			let params = _.defaults(options, {
				host: '127.0.0.1',
				port: 1337,
				negotiationMandatory: true,
				ors: '\r\n',
				waitfor: '\n'
			});
			resolve(connection.connect(params));
		});
	}

	// Authenticate user credentials
	authorize(auth) {
		let vpn = this;
		return vpn.exec('username "Auth" ' + auth.username)
		.then(function () {
			vpn.exec('password "Auth" ' + auth.password);
		});
	}

	// Disconnects from stream. Some data may still be sent
	disconnect() {
		if (connection) {
			return this.exec('signal SIGTERM');
		}
		return false;
	}

	// Removes all instances of connection input/output
	destroy() {
		if (connection) {
			connection.destroy();
		}
		return false;
	}

	// Telnet OpenVPN Execution Commands
	exec(param) {
		let vpn = this;
		return new Promise(function (resolve, reject) {
			if (connection) {
				connection.send(param, function (error, response) {
					if (error) reject(error);
					resolve(vpn._emitData(response.toString()));
				});
			}
			else {
				reject(vpn.emit('error', 'Error: Connection Not Established'));
			}
		});
	}

	// Emit data from provided response string
	_emitData(response) {
		let vpn = this;
		_.each(response.split("\n"), function (response) {
			if (response) {
				if (response.substr(1, 5) === 'STATE') {
					vpn.emit('data', {state: response.substr(7).split(",")});
				}
				else if (response.substr(1, 4) === 'HOLD') {
					vpn.emit('data', {hold: true});
				}
				else if (response.substr(0, 7) === 'SUCCESS') {
					vpn.emit('data', {success: response.substr(8)});
				}
				else if ((response.substr(0, 5) === 'FATAL') || (response && response.substr(0, 5) === 'ERROR')) {
					vpn.emit('error', response);
				}
				else if (response.substr(1, 9) === 'BYTECOUNT') {
					vpn.emit('data', {bytecount: response.substr(11).split(",")});
				}
				else if (response.substr(0, 7) === 'SUCCESS') {
					if (response.substr(9, 3) === 'pid') {
						vpn.emit('data', {pid: response.substr(13).trim()});
					}
				}
				else if (response.substr(1, 3) === 'LOG') {
					vpn.emit('log', response.substr(4).split(',')[2]);
				}
				else {
					vpn.emit('log', response);
				}
			}
		});
	}
};