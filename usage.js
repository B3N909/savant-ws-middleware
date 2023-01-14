class Animal {
    constructor(name) {
        console.log("(...Animal) constructed", name);
        this.name = name;
    }

    static create (name) {
        console.log("(...Animal) creating", name);
        return new Animal(name);
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

    const animal = await RemoteAnimal.create("dog");
    console.log(animal.name)
})();