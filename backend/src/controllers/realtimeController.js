const eventBus = require('../realtime/eventBus');

const stream = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial handshake event
    res.write(`data: ${JSON.stringify({ type: 'connected', ts: new Date().toISOString() })}\n\n`);

    eventBus.subscribe(res);

    const heartbeat = setInterval(() => {
        try {
            res.write(`: ping ${Date.now()}\n\n`);
        } catch (_err) {
            // no-op
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        eventBus.unsubscribe(res);
    });
};

module.exports = {
    stream,
};

