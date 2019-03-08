/**
 * Philip Smith
 * Original repo at
 * https://github.com/smithp1992/telnet-openvpn/
 */
import Telnet from 'telnet-client';
import EventEmitter from 'events';
import _ from 'lodash';
import q from 'q';

class TelnetVPN extends EventEmitter {
  constructor() {
    super();
    this.connection = new Telnet();
    // Telnet connected to management port
    this.connection.on('connect', () => {
      this.emit('connect');
    });
    // Sort and emit vpn console log
    this.connection.on('data', (response) => {
      this._emitData(response.toString());
    });
    // Telnet error
    this.connection.on('error', (error) => {
      this.disconnect();
      this.emit('error', error);
    });
    // Ending telnet session
    this.connection.on('end', () => {
      this.emit('end');
    });
    // Closing telnet session
    this.connection.on('close', () => {
      this.emit('close');
    });
  }
  
  // Connect To VPN through Telnet
  connect(options) { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      let params = _.defaults(options, {
        host: '127.0.0.1',
        port: 1337,
        negotiationMandatory: true,
        ors: '\r\n',
        sendTimeout: 3000
      });
      resolve(this.connection.connect(params));
    });
  }
  
  // Authenticate user credentials
  authorize(auth) { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      this.exec('username "Auth" ' + auth.username).then(() => {
        this.exec('password "Auth" ' + auth.password).then(() => {
          resolve();
        });
      }).catch((error) => {
        reject(error);
      });
    });
  }
  
  // Disconnects from stream. Some data may still be sent
  disconnect() { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      if (this.connection) {
        resolve(this.exec('signal SIGTERM'));
      }
      else {
        reject(new Error("Telnet connection undefined"));
      }
    });
  }
  
  // Removes all instances of connection input/output
  destroy() { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      if (this.connection) {
        resolve(this.connection.destroy());
      }
      else {
        reject(new Error("Telnet connection undefined"));
      }
    });
  }
  
  // Exit telnet terminal (Only closes telnet terminal)
  end() { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      if (this.connection) {
        resolve(this.connection.end());
      }
      else {
        reject(new Error("Telnet connection undefined"));
      }
    });
  }
  
  // Telnet OpenVPN Execution Commands
  exec(param) { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      if (this.connection) {
        this.connection.send(param, (error) => {
          if (error) reject(error);
          resolve();
        });
      }
      else {
        reject(this.emit('error', 'Error: connection Not Established'));
      }
    });
  }
  
  // Emit data from provided response string
  _emitData(response) {
    _.each(response.split("\n"), (data) => {
      if (data) {
        if (data.substr(1, 5) === 'STATE') {
          this.emit('data', {state: data.substr(7).split(",")});
        }
        else if (data.substr(1, 4) === 'HOLD') {
          this.emit('data', {hold: true});
        }
        else if (data.substr(0, 7) === 'SUCCESS') {
          if (data.substr(9, 3) === 'pid') {
            this.emit('data', {pid: data.substr(13).trim()});
          }
          else {
            this.emit('data', {success: data.substr(8)});
          }
        }
        else if ((data.substr(0, 5) === 'FATAL') || (data && data.substr(0, 5) === 'ERROR')) {
          this.emit('error', data);
        }
        else if (data.substr(1, 13) === 'BYTECOUNT_CLI') {
          this.emit('data', {bytecount_cli: data.substr(15).trim().split(",")});
        }
        else if (data.substr(1, 9) === 'BYTECOUNT') {
          this.emit('data', {bytecount: data.substr(11).split(",")});
        }
        else if (data.substr(1, 8) === 'PASSWORD') {
          this.emit('data', {password: data.substr(10).split(",")})
        }
        else if (data.substr(1, 3) === 'LOG') {
          this.emit('log', data.substr(4).split(',')[2]);
        }
        else {
          this.emit('log', data);
        }
      }
    });
  }
}

module.exports = TelnetVPN;