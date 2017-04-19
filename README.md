# telnet-openvpn
Connect to OpenVPN management port through telnet. 

  
## Installation
```bash
$ npm install telnet-openvpn --save
```
  
## Usage  
### ECMAScript 5
```js
var TelnetVPN = require('telnet-openvpn');
  
var vpn = new TelnetVPN();
  
var options = {
    host: '127.0.0.1',
    port: 1337,
    negotiationMandatory: true,
    ors: '\r\n',
    sendTimeout: 3000
};
  
var auth = {
    username: 'username',
    password: 'password'
};
  
  
vpn.connect(options);
  
vpn.on('connect', function() {
    vpn.exec('state on all').then(function() {
        vpn.exec('hold release').then(function() {
            vpn.authorize(auth).then(function(data) {
                // User is now connected
            });
        })
    })
});
  
vpn.on('log', function(result) {
    console.log(result);
});
  
vpn.on('error', function(result) {
    console.log(result);
    vpn.disconnect();
});
  
vpn.on('end', function(result) {
    console.log(result);
    vpn.destroy();
});
  
vpn.on('data', function(result) {
    console.log(result);
});
```  
  
### ECMAScript 6  
```js
import TelnetVPN from 'telnet-openvpn';
  
let vpn = new TelnetVPN();
  
let options = {
    host: '127.0.0.1',
    port: 1337,
    negotiationMandatory: true,
    ors: '\r\n',
    sendTimeout: 3000
};
  
let auth = {
    username: 'username',
    password: 'password'
};
  
  
vpn.connect(options);
  
vpn.on('connect', () => {
    vpn.exec('state on all').then(() => {
        vpn.exec('hold release').then(() => {
            vpn.authorize(auth).then((data) => {
                // User is now connected
            });
        });
    })
});
  
vpn.on('log', (result) => {
    console.log(result);
});
  
vpn.on('error', (error) => {
    console.log(error);
    vpn.destroy();
});
  
vpn.on('end', (result) => {
    console.log(result);
});
  
vpn.on('data', (result) => {
    console.log(result);
});
```  
  
## API  
  
### vpn.connect(options) -> Promise
Connects to the management port specified in the .ovpn file.  
More options can be found in the [telnet-client](https://github.com/mkozjak/node-telnet-client#connectionconnectoptions---promise) docs.  
  
options:  
* host: Management IP address specified under "management" in .ovpn file (default: '127.0.0.1').  
* port: Management port specified under "management" in .ovpn file (default: 1337).  
* negotiationMandatory: Enable to disable telnet negotiations (default: true).  
* ors: Output record separator. Used to execute commands from telnet console (default: '\r\n').  
* sendTimeout: Waits for input return character (default: 3000).  
  
### vpn.authorize(options) -> Promise  
After user connects, vpn.authorize(auth) must be called if .ovpn file specifies auth-user-pass.  
  
options:  
* username: Client username for VPN service.  
* password: Client password for VPN service  
  
### vpn.exec(event) -> Promise  
Specify telnet console commands through this function.  
  
### vpn.on(event, [callback])  
EventEmitter options emitted as information is received from telnet console.  
  
events:  
* connect: Telnet console has successfully connected to management port. 
* log: Telnet console log outputs. 
* error: Telnet console error outputs.  
* end: Telnet console has ended session to management port.
* data: Telnet console output data important to user (JSON Formatted). 
    * state: (array) Current state of telnet console.  
    * hold: Telnet console waiting for user commands.  
    * success: Telnet data successfully obtained.  
    * bytecount: Telnet byte count.  
    * pid: Process id of session.  
  
### vpn.disconnect() -> Promise  
Ends telnet session and triggers the 'end' event emitter.  
  
### vpn.destroy() -> Promise  
Removes all instances of telnet console socket connection. Used for 'error' event emitter.
  
## Important .ovpn file information:  
```bash
# OpenVPN management IP and port (localhost 1337).
management 127.0.0.1 1337
# OpenVPN wait for hold release from telnet console (vpn.exec('hold release')).
management-hold
# OpenVPN wait for authentication from telnet console (vpn.authorize(auth)).
management-query-passwords
# OpenVPN authenticate using username and password from telnet console.
auth-user-pass
```
  
## Credits  
  [telnet-client](https://github.com/mkozjak/node-telnet-client)  
  [node-openvpn](https://github.com/luigiplr/node-openvpn)