/**
 * Created by Philip Smith on 2/5/2017.
 */
import Telnet from 'telnet-client';
import EventEmitter from 'events';
import _ from 'lodash';
import q from 'q';

let connection = false;

export default class TelnetVPN extends EventEmitter {
  constructor() {
    super();
    let vpn = this;
    connection = new Telnet();
    // Telnet connected to management port
    connection.on('connect', () => {
      vpn.emit('connect');
    });
    // Sort and emit vpn console log
    connection.on('data', (response) => {
      vpn._emitData(response.toString());
    });
    // Telnet error
    connection.on('error', (error) => {
      vpn.disconnect();
      vpn.emit('error', error);
    });
    // Ending telnet session
    connection.on('end', () => {
      vpn.emit('end');
    });
    // Closing telnet session
    connection.on('close', () => {
      vpn.emit('close');
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
      resolve(connection.connect(params));
    });
  }
  
  // Authenticate user credentials
  authorize(auth) { // -> Promise
    let vpn = this;
    return q.Promise((resolve, reject, notify) => {
      vpn.exec('username "Auth" ' + auth.username).then(() => {
        vpn.exec('password "Auth" ' + auth.password).then(() => {
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
      if (connection) {
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
      if (connection) {
        resolve(connection.destroy());
      }
      else {
        reject(new Error("Telnet connection undefined"));
      }
    });
  }
  
  // Exit telnet terminal (Only closes telnet terminal)
  end() { // -> Promise
    return q.Promise((resolve, reject, notify) => {
      if (connection) {
        resolve(connection.end());
      }
      else {
        reject(new Error("Telnet connection undefined"));
      }
    });
  }
  
  // Telnet OpenVPN Execution Commands
  exec(param) { // -> Promise
    let vpn = this;
    return q.Promise((resolve, reject, notify) => {
      if (connection) {
        connection.send(param, (error) => {
          if (error) reject(error);
          resolve();
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
    _.each(response.split("\n"), (response) => {
      if (response) {
        if (response.substr(1, 5) === 'STATE') {
          vpn.emit('data', {state: response.substr(7).split(",")});
        }
        else if (response.substr(1, 4) === 'HOLD') {
          vpn.emit('data', {hold: true});
        }
        else if (response.substr(0, 7) === 'SUCCESS') {
          if (response.substr(9, 3) === 'pid') {
            vpn.emit('data', {pid: response.substr(13).trim()});
          }
          else {
            vpn.emit('data', {success: response.substr(8)});
          }
        }
        else if ((response.substr(0, 5) === 'FATAL') || (response && response.substr(0, 5) === 'ERROR')) {
          vpn.emit('error', response);
        }
        else if (response.substr(1, 9) === 'BYTECOUNT') {
          vpn.emit('data', {bytecount: response.substr(11).split(",")});
        }
        else if (response.substr(1, 8) === 'PASSWORD') {
          vpn.emit('data', {password: response.substr(10).split(",")})
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