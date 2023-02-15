window.wsMiddlewareClient = (port) => {
    const socket = new WebSocket(`ws://localhost:${port}`);
    const callbacks = {};

    socket.onopen = () => {
        console.log("(Client) Connected");
    };
    socket.onclose = () => {
        console.log("(Client) Disconnected");
    };
    socket.onmessage = (message) => {
        try {
            const object = JSON.parse(message.data);
            console.log("(Client) Received message", object);

            if(object._id) {
                if(callbacks[object._id]) {
                    callbacks[object._id](object);
                    delete callbacks[object._id];
                }
            }
        } catch(err) {
            console.error(err);
        }
    };

    const send = async (name, type) => {
        return await new Promise(r => {
            const _id = Math.random().toString(36).substr(2, 9);
            callbacks[_id] = r;

            socket.send(JSON.stringify({
                _id,
                name,
                type
            }));
        })
    }
    return send;
}