const { bigOak, defineRequestType, everywhere } = require('./crow-tech');

/**
 * Promise wrapper for defineRequestType
 * @param {String} name - Name of request type the handler will be responsible for
 * @param {Function} handler - The function that will handle the any requests
 */
function requestType(name, handler) {
    // the defineRequestType callback is literally just a wrapper around the send callback, putting it in a 
    // setTimeout function so it mimicks async functionality
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
 * @returns {Promise} Promise object representing the state of the request. If the handler for the request type returns a value, this will wrap that object.
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

function storageHandler(nest, name) {
    // WHY does this fail without a return statement
    // but (nest, name) => storage(nest,name) works when passed as an arrow function
    // to requestType raw versus passing this named function?!
    return storage(nest, name);
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
            // these callbacks will be called when the promises are used (inside Promise.all)
                .then(() => true, () => false);
    });
    // Promise.all returns a promise that resolves to the values of the promises in the array
    // The thing that the FUNCTION returns is a Promise
    return Promise.all(requests).then(result => {
        // This will be used by any .then() that is attached to the Promise this function returns (see above comment)
        // Specifically, once the .then() runs, this will run, and the value it returns will be used by the 
        // .then() attached to the Promise this function returned
        return nest.neighbors.filter((_, i) => result[i]);
    });
}

/**
 * Sends a piece of gossip from one nest to all its neighbors unless one is specified to skip.
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
 * @returns {Promise} Promise object representing the value of the given key.
 */
function storage(nest, name) {
    return new Promise(resolve => {
        nest.readStorage(name, result => resolve(result));
    });
}

/**
 * Sends a request of the specified type from one nest to another. A dedicated function is used because the actual type of the request sent varies, but only requests of type "route" will trigger searching for another "hop" in the network. This function takes care of the logic needed to check if the request needs to be sent further or if it can be sent to its destination without further routing.
 * @param {Node} nest - The nest from which the message will be sent.
 * @param {Node} target - The nest that the message will be delivered to.
 * @param {String} type - The request type of the message (to dictate the handling behavior).
 * @param {Object} content - The content of the message itself.
 * @returns {Promise} Promise object representing the request's resolution. 
 * @throws {Error} Error thrown if there is no route available to the targest nest.
 */
function routeRequest(nest, target, type, content) {
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

/**
 * Returns the network that the given nest is part of.
 * @param {Node} nest - Nest that is part of the desired network.
 * @return {Array} - Array containing the name of all nests in the network.
 */
function network(nest) {
    // Array.from is used because keys() returns an iterator, not an array itself
    return Array.from(nest.state.connections.keys());
}

/**
 * Function to check all nests in a network for the specified entry. While it will start checking at the specified nest,
 * it will go through the entire network if the entry is not found in the first nest.
 * @param {Node} nest - The nest to check originally for the data.
 * @param {String} name - Name of the key to check storage for.
 */
function findInStorage(nest, name) {
    return storage(nest, name).then(found => {
        // if the nest had the requested info in it return the data
        if (found != null) return found;
        // if it didn't, check other nests and return the data when it's found (or nothing if search fails)
        else return findInRemoteStorage(nest, name);
    });
}

// this is from when findInStorage wasn't written using async/await. Left in as note/example of the alternative.
// function findInRemoteStorage(nest, name) {
//     // get all other nests in network
//     let sources = network(nest).filter(n => n != nest.name);
//     // recursive function to loop through nests
//     function next() {
//         // if no more nests in network
//         if (sources.length == 0) {
//             return Promise.reject(new Error("Not found"));
//         } else {
//             // get random nest
//             let source = sources[Math.floor(Math.random() * sources.length)];
//             // remove source from list of nests not checked
//             sources = sources.filter(n => n != source);
//             console.log('About to try routing request for storage');
//             return routeRequest(nest, source, 'storage', name)
//                 // if value isn't null, return the value, else call next again
//                 // Stuff in here only runs when a .then() is attached to the Promise this function returns
//                 .then(value => value != null ? value : next());
//         }
//     }
//     // start calls. Return needs to be on same line due to Promise chaining
//     return next();
// }

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
requestType('storage', storageHandler); // (nest, name) => storage(nest, name)


// Create gossip array on each nest's local state
everywhere(nest => nest.state.gossip = []);
// Give each nest graph of connections/neighbors that each nest has
everywhere(nest => {
    nest.state.connections = new Map();
    // Make sure each nest has its own neighbors in the connections map
    nest.state.connections.set(nest.name, nest.neighbors);
    broadcastConnections(nest, nest.name);
})
console.log('This is in the main program');
availableNeighbors(bigOak).then(val => console.log(val));
request(bigOak, 'Cow Pasture', 'note', 'This is a note')
    .then((val) => console.log(val))
    .catch((err) => console.log(err));
sendGossip(bigOak, 'Some gossip');
console.log('Still in the main program');
storage(bigOak, 'enemies').then( val => console.log("Got", val));
// Need to wrap any call to routeRequest in a setTimeout because otherwise the connections won't have time to broadcast
// and the route planning will fail
setTimeout(() => {
    console.log("Inside timeout of main program");
    routeRequest(bigOak, 'Church Tower', 'note', 'This is a note').then(val => console.log(val));
    console.log('After first route request has been sent');
    // findInStorage(bigOak, "events on 2017-12-21").then(val => console.log(val));
    console.log(findInRemoteStorage(bigOak, "events on 2017-12-21").then(val => console.log(val)));
}, 3000);
