const clients = new Set();

function subscribe(client) {
    clients.add(client);
}

function unsubscribe(client) {
    clients.delete(client);
}

function publish(event) {
    const payload = JSON.stringify({
        type: 'mutation',
        ts: new Date().toISOString(),
        ...event,
    });

    for (const client of clients) {
        try {
            client.write(`data: ${payload}\n\n`);
        } catch (_err) {
            clients.delete(client);
        }
    }
}

module.exports = {
    subscribe,
    unsubscribe,
    publish,
};

