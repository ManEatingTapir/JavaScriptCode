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

function connectionsHandler(nest, {name, neighbors}, source) {
    let connections = nest.state.connections;
    if (JSON.stringify(connections.get(name)) == JSON.stringify(neighbors)) return;
    connections.set(name, neighbors);
    broadcastConnections(nest, name, source);
}

function routeHandler(nest, {target, type, content}) {
    // all needed logic is in the routeRequest function, this just wraps it in a handler
    // return must be on same line as routeRequest, since that function does return something (a Promise)
    return routeRequest(nest, target, type, content);
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

/**
 * Sends the connections of a given nest to all other reachable nests in the network. 
 * @param {Node} nest - The nest whose connections will be broadcast 
 * @param {String} name - The name of the nest being broadcast
 * @param {Node} [exceptFor] - A nest to not send connections to. Used to skip nests that were the source of the previous broadcast. By default is null. 
 */
function broadcastConnections(nest, name, exceptFor = null) {
    for (let neighbor of nest.neighbors) {
      if (neighbor == exceptFor) continue;
      request(nest, neighbor, "connections", {
        name,
        // this is used so a neighbors parameter is not needed to be passed. Depends on the nest having the connections already stored
        neighbors: nest.state.connections.get(name)
      });
    }
  }

/**
 * Checks a given nest's storage for the given piece of information. Returns a Promise that will resolve to the data requested. Effectively a Promise wrapper for the readStorage method.
 * @param {Node} nest - The nest containing the data to read.
 * @param {String} name - The name of the key to check in storage.
 */
function storage(nest, name) {
    return new Promise(resolve => {
        nest.readStorage(name, result => resolve(result));
    });
}

function routeRequest(nest, target, type, content) {
    // A dedicated function is used here because the type of request will be varied, not route, so a dedicated request type has to be
    // defined that handles routing 
    // if the target is an immediate neighbor
    if (nest.neighbors.includes(target)) {
        // the return must be on the same line as the request, since the request returns a Promise value
        // that will be used for further processing
        return request(nest, target, type, content);
    } else {
        // send a route-type request to a nest, alerting it to continue passing the message along
        let via = findRoute(nest.name, target, nest.state.connections);
        if (!via) throw new Error(`No route available to ${target}`);
        // make the request to the next hop, telling it to continue this behavior while passing the target/type/content as the content of the request itself
        // again, return is on same line to pass the Promise returned by request on for further processing
        return request(nest, via, 'route', {target, type, content});
    }
}
// Don't worry too much about understanding this deeply, it's graph theory/route finding stuff. Look into at a later time
function findRoute(from, to, connections) {
    let work = [{at: from, via: null}];
    for (let i = 0; i < work.length; i++) {
      let {at, via} = work[i];
      for (let next of connections.get(at) || []) {
        if (next == to) return via;
        if (!work.some(w => w.at == next)) {
          work.push({at: next, via: via || next});
        }
      }
    }
    return null;
  }
// <-- Where code execution will actually begin -->
// Add support for the various message types
requestType("note", noteHandler);
requestType("ping", pingHandler);
requestType('gossip', gossipHandler);
requestType('connections', connectionsHandler);
requestType('route', routeHandler);

// Create gossip array on each nest's local state
everywhere(nest => nest.state.gossip = []);
request(bigOak, 'Cow Pasture', 'note', 'This is a note')
    .then((val) => console.log(val))
    .catch((err) => console.log(err));
// Give each nest graph of connections/neighbors that each nest has
everywhere(nest => {
    nest.state.connections = new Map();
    // Make sure each nest has its own neighbors in the connections map
    nest.state.connections.set(nest.name, nest.neighbors);
    broadcastConnections(nest, nest.name);
})
console.log('this is in the main program');
availableNeighbors(bigOak).then(val => console.log(val));
sendGossip(bigOak, 'Some gossip');
console.log('still in the main program');
storage(bigOak, 'enemies').then( val => console.log("Got", val));
// Need to wrap any call to routeRequest in a setTimeout because otherwise the connections won't have time to broadcast
// and the route planning will fail
setTimeout(() => {
    routeRequest(bigOak, 'Church Tower', 'note', 'fuck').then(val => console.log(val));
}, 3000);
