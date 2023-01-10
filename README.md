# @savant/ws-middleware
`@savant/ws-middleware` is a library that enables you to add remote WebSocket support to any pre-existing class or function, while still retaining the existing syntax. This is particularly useful when you want to use the same syntax in both local and remote contexts.

`ws-middleware` achieves this by wrapping the class or function with a WebSocket server, which then proxies the calls to the remote context. This allows you to use the same syntax in both the local and remote contexts, without having to worry about the underlying communication mechanism.



*See examples below for further explanation*

## Installation
To install @savant/ws-middleware, run the following command:
```bash
npm install @savant/ws-middleware
```

## Usage
Here's an example of how to use @savant/ws-middleware with a class:
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

    // Wrap our Animal class with a WebSocket client
    const RemoteAnimal = Client(Animal, "ws://127.0.0.1:3000");

    const remoteAnimal = new RemoteAnimal("dog");
    const result = await remoteAnimal.wait10Seconds(10);
    console.log("Result:", result); // prints "Result: waited 10 seconds!"
})();

```
On the "host" or "server" side, we use the `Host` function provided by `@savant/ws-middleware` to wrap the `Animal` class with a WebSocket server. On the "client" side, we use the `Client` function to create a proxy to the remote `Animal` class. We can then use this proxy as if it were a local instance of the `Animal` class, while the underlying communication is handled transparently by `@savant/ws-middleware`.
<br><br><br>
Here's an example of how to use `@savant/ws-middleware` with a function:
```javascript
function add(a, b) {
    return a + b;
}

// Host / Server
(async () => {
    const { Host } = require("@savant/ws-middleware");
    const server = new Host(add);
    server.listen(3000);
})();

// Client
(async () => {
    const { Client } = require("@savant/ws-middleware");
    const remoteAdd = Client(add, "ws://127.0.0.1:3000");
    const result = remoteAdd(1, 2);
    console.log("Result:", result); // prints "Result: 3"
})();
```

## Additional Examples

```javascript
async function getData(url) {
    const response = await fetch(url);
    return response.json();
}

// Host / Server
(async () => {
    const { Host } = require("@savant/ws-middleware");
    const server = new Host(getData);
    server.listen(3000);
})();

// Client
(async () =>
    const { Client } = require("@savant/ws-middleware");
    const remoteGetData = Client(getData, "ws://127.0.0.1:3000");

    const data = await remoteGetData("https://api.example.com/data");
    console.log(data); // prints the JSON data returned by the API
})();
```