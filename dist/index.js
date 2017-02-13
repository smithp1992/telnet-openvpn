'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _telnetClient = require('telnet-client');

var _telnetClient2 = _interopRequireDefault(_telnetClient);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Created by Philip Smith on 2/5/2017.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */


var connection = false;

var TelnetVPN = function (_EventEmitter) {
	_inherits(TelnetVPN, _EventEmitter);

	function TelnetVPN() {
		_classCallCheck(this, TelnetVPN);

		var _this = _possibleConstructorReturn(this, (TelnetVPN.__proto__ || Object.getPrototypeOf(TelnetVPN)).call(this));

		var vpn = _this;
		connection = new _telnetClient2.default();
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
		return _this;
	}

	// Connect To VPN through Telnet


	_createClass(TelnetVPN, [{
		key: 'connect',
		value: function connect(options) {
			// -> Promise
			return new _q2.default.Promise(function (resolve, reject, notify) {
				var params = _lodash2.default.defaults(options, {
					host: '127.0.0.1',
					port: 1337,
					negotiationMandatory: true,
					ors: '\r\n',
					sendTimeout: 3000
				});
				resolve(connection.connect(params));
			});
		}

		// Authenticate user credentials

	}, {
		key: 'authorize',
		value: function authorize(auth) {
			// -> Promise
			var vpn = this;
			return new _q2.default.Promise(function (resolve, reject, notify) {
				vpn.exec('username "Auth" ' + auth.username).then(function () {
					vpn.exec('password "Auth" ' + auth.password).then(function () {
						resolve();
					});
				}).catch(function (error) {
					reject(error);
				});
			});
		}

		// Disconnects from stream. Some data may still be sent

	}, {
		key: 'disconnect',
		value: function disconnect() {
			var _this2 = this;

			// -> Promise
			return new _q2.default.Promise(function (resolve, reject, notify) {
				if (connection) {
					resolve(_this2.exec('signal SIGTERM'));
				} else {
					reject(new Error("Telnet connection undefined"));
				}
			});
		}

		// Removes all instances of connection input/output

	}, {
		key: 'destroy',
		value: function destroy() {
			// -> Promise
			return new _q2.default.Promise(function (resolve, reject, notify) {
				if (connection) {
					resolve(connection.destroy());
				} else {
					reject(new Error("Telnet connection undefined"));
				}
			});
		}

		// Telnet OpenVPN Execution Commands

	}, {
		key: 'exec',
		value: function exec(param) {
			// -> Promise
			var vpn = this;
			return new _q2.default.Promise(function (resolve, reject, notify) {
				if (connection) {
					connection.send(param, function (error, response) {
						if (error) reject(error);
						resolve(vpn._emitData(response.toString()));
					});
				} else {
					reject(vpn.emit('error', 'Error: Connection Not Established'));
				}
			});
		}

		// Emit data from provided response string

	}, {
		key: '_emitData',
		value: function _emitData(response) {
			var vpn = this;
			_lodash2.default.each(response.split("\n"), function (response) {
				if (response) {
					if (response.substr(1, 5) === 'STATE') {
						vpn.emit('data', { state: response.substr(7).split(",") });
					} else if (response.substr(1, 4) === 'HOLD') {
						vpn.emit('data', { hold: true });
					} else if (response.substr(0, 7) === 'SUCCESS') {
						vpn.emit('data', { success: response.substr(8) });
					} else if (response.substr(0, 5) === 'FATAL' || response && response.substr(0, 5) === 'ERROR') {
						vpn.emit('error', response);
					} else if (response.substr(1, 9) === 'BYTECOUNT') {
						vpn.emit('data', { bytecount: response.substr(11).split(",") });
					} else if (response.substr(0, 7) === 'SUCCESS') {
						if (response.substr(9, 3) === 'pid') {
							vpn.emit('data', { pid: response.substr(13).trim() });
						}
					} else if (response.substr(1, 3) === 'LOG') {
						vpn.emit('log', response.substr(4).split(',')[2]);
					} else {
						vpn.emit('log', response);
					}
				}
			});
		}
	}]);

	return TelnetVPN;
}(_events2.default);

exports.default = TelnetVPN;
;