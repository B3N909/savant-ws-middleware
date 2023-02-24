const WebSocket = require("ws");
const request = require("request");
let doLog = false;
let ip = false;

class WebSocketClient {

    async _getWsUrl (url) {
        if(url.startsWith("ws://") || url.startsWith("wss://")) return url;

        let v = await new Promise(r => {
            request({
                url,
                method: "GET",
                json: true
            }, (err, resp, body) => {
                if(err || !resp || !resp.statusCode || resp.statusCode !== 200) {
                    if(err) r(false);
                    if(body && body.includes("Max instances reached")) throw new Error("Max cloud instances reached, cannot connect to redirect URL")
                    else throw new Error("Invalid response from server, cannot connect to redirect URL");
                }

                if(body) {
                    if(typeof body.externalIP === "undefined") throw new Error("Invalid response from server, cannot connect to redirect URL, no redirect IP");
                    if(!body.externalIP) r(false);
    
                    let externalIP = body.externalIP;
                    if(!externalIP.includes(":")) externalIP += ":3000";
                    ip = externalIP;
                    if(doLog) console.log("Redirecting to", ip);
                    return r(ip);
                } else {
                    r(false);
                }
            });
        });
        if(!v) return await this._getWsUrl(url);
        return `ws://${v}`;
    }

    constructor(url, args) {
        this.isOpen = false;
        

        this._getWsUrl(url).then(wsUrl => {
            this.wsUrl = wsUrl;
            
            const EventEmitter = require("events");
            this.events = new EventEmitter();
            this.ws = new WebSocket(wsUrl);

            this.ws.on("open", () => {
                if(doLog) console.log("(Client) Connected to WebSocket");
                this.isOpen = true;

                this.handle({
                    name: "constructor",
                    args
                });
            });
            this.ws.on("close", () => {
                if(doLog) console.log("(Client) Disconnected from WebSocket");
                this.isOpen = false;

                this.handle({
                    name: "close",
                    args: []
                })
            });
            this.ws.on("message", (message) => {
                try {
                    const object = JSON.parse(message);
                    if(doLog) console.log("(Client) Received message", object);

                    if(object._id) {
                        this.events.emit(object._id, object);
                    }
                } catch(err) {
                    console.error(err);
                }
            });
        });
    }

    async connect () {
        // wait for this.isOpen = true;
        return await new Promise(r => {
            const interval = setInterval(() => {
                if(this.isOpen) {
                    clearInterval(interval);
                    r();
                }
            }, 250);
        });
    }

    async handle (object) {
        if(!this.isOpen) await this.connect();

        const id = Math.random().toString(36).substr(2, 9);
        object._id = id;

        
        if(doLog) console.log(`(Client) Sending message`, object, `to`, `${this.wsUrl}`)
        this.ws.send(JSON.stringify(object));
        
        return await new Promise(r => this.events.once(id, r))
    }
}

// This function should return an array of all the methods in a class prototype, including inherited methods.
// For example: GetClassMethods(Dog) should return ["bark", "idle", "newDog"] (in any order)
// Make sure we grab any static methods as well.
const GetClassMethods = (root) => {
    const methods = [];
    let current = root;

    while(current !== null && current.prototype) {
        const keys = Object.getOwnPropertyNames(current.prototype);
        for (const key of keys) {
            if(!methods.includes(key)) methods.push(key);
        }

        current = Object.getPrototypeOf(current);
    }

    const staticMethods = [];
    current = root;

    while(current !== null && /* prototype is not null */ current.prototype) {

        const keys = Object.getOwnPropertyNames(current);
        // console.log(current);
        for (const key of keys) {
            if(["caller", "calle", "arguments"].includes(key)) continue;
            if(typeof current[key] === "function") {
                if(doLog) console.log(" + " + key);
                if(!staticMethods.includes(key)) staticMethods.push(key);
            }
        }

        current = Object.getPrototypeOf(current);
    }

    // return {
    //     methods,
    //     staticMethods
    // }

    return methods;
}

const HostMiddleware = (root, options) => {
    // if options is number
    if(typeof options === "number") {
        options = {
            port: options
        }
    }

    let doLog = false;
    
    if(!options) options = {};
    if(!options.port) options.port = process.env.PORT || 3000;
    if(!options.maxConnections) options.maxConnections = 1;
    if(options.doLog) doLog = true;
    
    let instance;
    let disconnectCallback, connectCallback;

    const _handle = async (socket, object) => {
        const name = object.name;
        const args = object.args;
        const _id = object._id;

        // if root is an object
        if(typeof root === "object") {

            if(!root[name]) throw new Error("Root method does not exist!");

            if(doLog) console.log("(Server) Calling root object method", name, args);
            let result = await root[name](...args);

            // remove any private fields
            // for (const key in result) {
            //     if(key.startsWith("_")) delete result[key];
            // }
            
            const str = JSON.stringify({
                _id,
                result
            });

            socket.send(str);

        } else {
            if(name === "constructor") {
                instance = new root(...args);
                if(doLog) console.log("(Server) Created new root instance");
    
                socket.send(JSON.stringify({
                    _id,
                    result: true
                }));
            } else if(name === "close") {
                delete instance;
                if(doLog) console.log("(Server) Destroyed root instance");
    
                socket.send(JSON.stringify({
                    _id,
                    result: true
                }));
            } else {
                if(!instance) throw new Error("No root instance exists!");
                if(typeof instance[name] !== "function") throw new Error("Root method does not exist!");
    
                if(doLog) console.log("(Server) Calling root method", name, args);
                let result = await instance[name](...args);
    
                // remove any private fields
                // for (const key in result) {
                //     if(key.startsWith("_")) delete result[key];
                // }
                
                const str = JSON.stringify({
                    _id,
                    result
                }, (key, value) => {
                    if (key.startsWith("_") && key !== "_id") {
                      return undefined;
                    }
                    return value;
                });
    
                if(doLog) console.log("(Server) Sending result", str, "to client with id ", _id);
    
                socket.send(str);
            }
        }
    }


    let connections = 0;

    const ws = new WebSocket.Server({ port: options.port });
    if(doLog) console.log(`(Server) Listening on port ${options.port}`);
    ws.on("connection", (socket) => {
        if(connections > options.maxConnections) {
            if(doLog) console.log(`(Server) Max connections reached, closing connection from ${socket._socket.remoteAddress}`);
            socket.close();
            return;
        }

        // Handle New Connection
        connections++;
        if(doLog) console.log(`(Server) New connection from ${socket._socket.remoteAddress}`);

        if(connectCallback) connectCallback({
            connections: connections,
            maxConnections: options.maxConnections,
        });

        // Handle Messages
        socket.on("message", async (message) => {
            message = message.toString();
            if(doLog) console.log("(Server) Received", message);

            try {
                const object = JSON.parse(message);
                await _handle(socket, object);
            } catch (err) {
                console.error(err);
            }
        });

        socket.on("close", (e) => {
            connections--;
            if(disconnectCallback) disconnectCallback({
                connections: connections,
                maxConnections: options.maxConnections,
            });
            if(doLog) console.log(`(Server) Connection from ${socket._socket.remoteAddress} closed`);
        });
    });

    return {
        close: async () => {
            await new Promise(r => ws.close(r));
            if(doLog) console.log("(Server) Closed");
        },
        connections: () => connections,
        port: () => options.port,
        maxConnections: () => options.maxConnections,
        onDisconnect: (callback) => {
            disconnectCallback = callback;
        },
        onConnect: (callback) => {
            connectCallback = callback;
        },
        isServer: true,
    }
}

const ClientMiddleware = (root, wsUrl, apiKey) => {
    // if root is of type object
    let methods = [];
    if(typeof root === "object") {
        const keys = Object.keys(root);
        for (const key of keys) {
            methods.push(key);
        }
    } else methods = GetClassMethods(root);
    
    class MiddlewareClass extends WebSocketClient {
        constructor(...args) {
            let fullWsUrl = wsUrl;
            if(apiKey) fullWsUrl += "?apiKey=" + apiKey;
            super(fullWsUrl, args)
            // wrap all of root's methods
            
            for (const key of methods) {
                this[key] = async (...args) => {
                    return await this.handle({
                        name: key,
                        args
                    });
                };
            }
        }
    }
    return MiddlewareClass;
}

module.exports = (_doLog) => {
    if(_doLog) doLog = _doLog;


    return {
        Host: HostMiddleware,
        Client: ClientMiddleware,
        getIP: () => {
            return ip;
        }
    }
}