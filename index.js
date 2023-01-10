const WebSocket = require("ws");

class WebSocketClient {
    constructor(wsUrl, args) {
        this.wsUrl = wsUrl;
        
        this.isOpen = false;

        const EventEmitter = require("events");
        this.events = new EventEmitter();
        this.ws = new WebSocket(wsUrl);

        this.ws.on("open", () => {
            this.isOpen = true;

            this.handle({
                name: "constructor",
                args
            });
        });
        this.ws.on("close", () => {
            this.isOpen = false;

            this.handle({
                name: "close",
                args: []
            })
        });
        this.ws.on("message", (message) => {
            try {
                const object = JSON.parse(message);
                console.log("(Client) Received message", object);

                if(object._id) {
                    this.events.emit(object._id, object);
                }
            } catch(err) {
                console.error(err);
            }
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

        
        this.ws.send(JSON.stringify(object));
        
        return await new Promise(r => this.events.once(id, r))
    }
}

// class ClientMiddleware {

//     constructor (wrap, url) {
//         this.client = new WebSocket(url);

//         // wrap all of wrap's methods
//         for (const key in wrap) {
//             if (typeof wrap[key] === "function") {
//                 this[key] = (...args) => {
//                     this.handle(key, ...args);
//                 };
//             }
//         }


//     }

//     handle (name, ...args) {
//         console.log("handle", name, arguments);

//         let object = {
//             name,
//             args
//         }
        
//         // send this over the WebSocket connection
//         this.client.handle(object);
//     }
// }

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
                console.log(" + " + key);
                if(!staticMethods.includes(key)) staticMethods.push(key);
            }
        }

        current = Object.getPrototypeOf(current);
    }

    return {
        methods,
        staticMethods
    }
}

class HostMiddleware {

    constructor (root) {
        this.root = root;
    }

    listen (port) {
        this.port = port;

        this.ws = new WebSocket.Server({ port });
        console.log(`(Server) Listening on port ${port}`);
        this.ws.on("connection", (socket) => {
            // console.log("+1 new connection to host");
            
            socket.on("message", async (message) => {
                message = message.toString();
                console.log("(Server) Received", message);

                try {
                    const object = JSON.parse(message);
                    await this._handle(socket, object);
                } catch (err) {
                    console.error(err);
                }
            });
        });
    }

    async _handle (socket, object) {
        const name = object.name;
        const args = object.args;
        const _id = object._id;

        if(name === "constructor") {
            this.instance = new this.root(...args);
            console.log("(Server) Created new root instance");

            socket.send(JSON.stringify({
                _id,
                result: true
            }));
        } else if(name === "close") {
            delete this.instance;
            console.log("(Server) Destroyed root instance");

            socket.send(JSON.stringify({
                _id,
                result: true
            }));
        } else {
            if(!this.instance) throw new Error("No root instance exists!");
            if(typeof this.instance[name] !== "function") throw new Error("Root method does not exist!");

            console.log("(Server) Calling root method", name, args);
            const result = await this.instance[name](...args);

            socket.send(JSON.stringify({
                _id,
                result
            }));
        }
    }
}

const ClientMiddleware = (root, wsUrl) => {
    return class MiddlewareClass extends WebSocketClient {
        constructor(...args) {
            super(wsUrl, args)
            // wrap all of root's methods
            
            const methods = GetClassMethods(root);
            for (const key of methods.methods) {
                this[key] = async (...args) => {
                    return await this.handle({
                        name: key,
                        args
                    });
                };
            }
            for (const key of methods.staticMethods) {
                this[key] = async (...args) => {
                    return await this.handle({
                        name: key,
                        args,
                        static: true
                    });
                };
            }
        }
    }
}

module.exports = {
    Host: HostMiddleware,
    Client: ClientMiddleware
}