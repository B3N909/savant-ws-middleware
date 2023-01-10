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
    const Host = require("./index.js").Host;
    const server = new Host(Animal);
    server.listen(3000);
})();


// Client
(async () => {
    const Client = require("./index.js").Client;
    const RemoteAnimal = Client(Animal, "ws://127.0.0.1:3000");

    const remoteAnimal = new RemoteAnimal("dog");
    const result = await remoteAnimal.wait10Seconds(10);
    console.log("Result:", result);
})();