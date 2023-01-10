# @savant/ws-middleware
Wrap any pre-existing class or function with `ws-middleware` to add remote WebSocket support, whilst retaining existing syntax. Specifically, `ws-middleware` excels in retaining syntax whilst still deploying to a remote context. This is achieved by wrapping the class or function with a WebSocket server, which then proxies the calls to the remote context. **This allows for the same syntax to be used in both local and remote contexts.**

*See examples below for further explanation*

## Installation
Install with npm:
```bash
npm install @savant/ws-middleware
```

## Usage

```javascript

class Animal {
    constructor(name) {
        console.log("(...Animal) constructed", name);
        this.name = name;
    }

    getName (name) {
        return name;
    }

    setAge (age) {
        console.log("(...Animal) age set: " + age);
        this.age = age;
    }

    async wait10Seconds () {
        return new Promise(r => setTimeout(() => {r("waited 10 seconds!")}, 10000));
    }
}


// Host / Server
(async () => {
    const { Host } = require("@savant/ws-middleware");
    const server = new Host(Animal);
    server.listen(3000);
})();


// Client
(async () => {
    const { Client } = require("@savant/ws-middleware");
    const RemoteAnimal = Client(Animal, "ws://127.0.0.1:3000");

    const remoteAnimal = new RemoteAnimal("dog");
    const result = await remoteAnimal.wait10Seconds(10);
    console.log("Result:", result);
})();


```