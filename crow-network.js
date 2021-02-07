const { bigOak, defineRequestType, everywhere } = require('./crow-tech');

/**
 * Promise wrapper for defineRequestType
 * @param {String} name - Name of request type the handler will be responsible for
 * @param {Function} handler - The function that will handle the any requests
 */
function requestType(name, handler) {
    // the defineRequestType callback is literally just a wrapper around the send callback
    defineRequestType(name, (nest, content, source, callback) => {
        try {
            // .catch will handle if the value that was returned is a failure
            Promise.resolve(handler(nest, content, source))
            .then(response => callback(null, response))
            .catch(failure => callback(failure));
        }
        // this catches if the handler itself raises an error
        catch (e) {
            callback(e);
        }
    });
}

/**
 * Promise wrapper for send.
 * @param {Node} nest - The nest that the request will be sent from
 * @param {String} target - The name of the nest that it will be sent to
 * @param {String} type - The type of request that is being sent
 * @param {String} content - The content of the request
 */
function request(nest, target, type, content) {
    return new Promise((resolve, reject) => {
        let done = false;
        function attempt(n) {
            nest.send(target, type, content, (failure, value) => {
                // when the response comes in this will run
                // console.log('this is the send method callback');
                done = true;
                if (failure) reject(failure);
                else resolve(value);
            });
            // wait a bit before making another request
            setTimeout(() => {
                if (done) return;
                else if (n < 3) attempt(n+1);
                else reject(new Error('Request failed due to timeout'));
            }, 250);
        }
        attempt(1);
    });
}

// <-- Area for various message type handlers -->
function noteHandler(nest, content, source) {
    let res = `${nest.name} received note from ${source}: ${content}`;
    // console.log('this is in the handler method for note');
    return res;
}

function pingHandler() {
    // console.log('this is in the handler method for ping');
    return "pong";
}

function gossipHandler(nest, content, source) {
    // if the nest has already heard the gossip
    if (nest.state.gossip.includes(content)) return;
    console.log(`${nest.name} received gossip '${
        content}' from ${source}`);
    // sends the gossip itself
    sendGossip(nest, content, source);
}

function connectionHandler(nest, {name, neighbors}, source) {
    let connections = nest.state.connections;
    if (JSON.stringify(connections.get(name)) == JSON.stringify(neighbors)) return;
    connections.set(name, neighbors);
    broadcastConnections(nest, name, source);
}
// <-- Other useful functions -->
/**
 * Finds all neighbors of the given nest that are able to respond. Uses a simple ping request to check availability.
 * @param {Node} nest - Nest to check neighbors for
 * @returns {Promise<Array>} Promise object representing an array with all neighbors
 */
function availableNeighbors(nest) {
    let requests = nest.neighbors.map(neighbor => {
        return request(nest, neighbor, 'ping')
            // request returns a promise, so the array will be composed of promises
            // these callbacks will be called when the promises are used
                .then(() => true, () => false);
    });
    // Promise.all returns a promise that resolves to the values of the promises in the array
    return Promise.all(requests).then(result => {
        return nest.neighbors.filter((_, i) => result[i]);
    });
}

/**
 * Sends a piece of gossip from one nest to all its neighbors unless one is specified
 * @param {Node} nest - The source nest
 * @param {String} message - The gossip to send
 * @param {Node} [exceptFor] - The nest to not send the gossip to. By default is null.
 */
function sendGossip(nest, message, exceptFor = null) {
    // add the gossip to the source nests' list
    nest.state.gossip.push(message);
    // loop through neighbors
    for (let neighbor of nest.neighbors) {
        // if the nest is the source of the message skip
        if (exceptFor == neighbor) continue;
        // send gossip request/message to neighbor
        request(nest, neighbor, 'gossip', message);
    }
}

function broadcastConnections(nest, name, exceptFor = null) {
    for (let neighbor of nest.neighbors) {
      if (neighbor == exceptFor) continue;
      request(nest, neighbor, "connections", {
        name,
        neighbors: nest.state.connections.get(name)
      });
    }
  }
  
/**
 * Checks a given nest's storage for the given piece of information. Returns a Promise that will resolve to the data requested.
 * @param {Node} nest - The nest containing the data to read.
 * @param {String} name - The name of the key to check in storage.
 */
function storage(nest, name) {
    return new Promise(resolve => {
        nest.readStorage(name, result => resolve(result));
    });
}
// <-- Where code execution will actually begin -->
// Add support for the various message types
requestType("note", noteHandler);
requestType("ping", pingHandler);
requestType('gossip', gossipHandler);

// Create gossip array on each nest's local state
everywhere(nest => nest.state.gossip = []);
request(bigOak, 'Cow Pasture', 'note', 'This is a note')
    .then((val) => console.log(val))
    .catch((err) => console.log(err));
console.log('this is in the main program');
availableNeighbors(bigOak).then(val => console.log(val));
sendGossip(bigOak, 'Some gossip');
console.log('still in the main program');
storage(bigOak, 'enemies').then( val => console.log("Got", val));