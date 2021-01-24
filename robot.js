// array of roads representing the town. Need to construct graph(!)
const roads = [
    "Alice's House-Bob's House", "Alice's House-Cabin",
    "Alice's House-Post Office", "Bob's House-Town Hall",
    "Daria's House-Ernie's House", "Daria's House-Town Hall",
    "Ernie's House-Grete's House", "Grete's House-Farm",
    "Grete's House-Shop", "Marketplace-Farm",
    "Marketplace-Post Office", "Marketplace-Shop",
    "Marketplace-Town Hall", "Shop-Town Hall"
];
function buildGraph(edges) {
    const graph = Object.create(null);
    function addConnection(from, to) {
        // If starting node is not already a property of the object, create it
        // and start an array intially containing destination node
        if (graph[from] == null) {
            graph[from] = [to];
        } // property already exists, just add destination node to array
        else {
            graph[from].push(to);
        }
    }
    // [from, to] deconstructs the array
    for (let [from, to] of edges.map(r => r.split('-'))) {
        // add connection one way
        addConnection(from, to);
        // add connection in reverse order
        addConnection(to, from);
    }
    return graph;
}
const roadGraph = buildGraph(roads);

function randomPick(array) {
    let choice = Math.floor(Math.random() * array.length);
    return array[choice];
}

// A robot takes in a current state and decides where to go. It returns an object containing
// the direction it wants to move and the memory (implemented later)
function randomRobot(state) {
    return {direction: randomPick(roadGraph[state.place])}
}

// a parcel is an object of form {place: string, address: string}
// parcel.place is it's current location
// address is where it needs to go
class VillageState {
    constructor(place, parcels) {
        this.place = place;
        this.parcels = parcels;
    }

    /**
     * Moves the robot and any parcels with it to the destination. Creates a new VillageState if it succeeds, and returns the current if it fails.
     * In detail: the function first checks if there are any packages that need to be "picked up" (added to the parcels property)
     * then filters out any packages in parcels where their address == destination (if the robot will "drop off" the package in this next move).
     * Finally returns a new VillageState with the updated place of the robot and the updated parcels.
     * @param {String} destination Name of node to move to.
     */
    move(destination) {
        // if destination is not valid move
        if (!roadGraph[this.place].includes(destination)) {
            return this;
        }
        // create new parcels array that will be placed into return state
        let parcels = this.parcels.map(p => {
            // if parcel's current place is not the current state's place, return the parcel unchanged
            // i.e. it hasn't been "picked up"
            if (p.place != this.place) return p;
            // return a new parcel where it's place is the destination (it's "moved") but the address is unchanged
            return {place: destination, address: p.address};
        }).filter(p => p.place != p.address);
        return new VillageState(destination, parcels);
    }

    // Static method to create a random assortment of parcels and then add it to a VillageState object
    static random(parcelCount = 5) {
        let parcels = [];
        for (let i = 0; i < parcelCount; i++) {
            // select a random node from the graph as the starting place
            let address = randomPick(Object.keys(roadGraph));
            // create place variable
            let place;
            // this will run at least once, but if the address is the same as the place go again
            do {
                place = randomPick(Object.keys(roadGraph));
            } while(place == address);
            parcels.push({place, address});
        }
        return new VillageState('Post Office', parcels);
    }
}

// Driver code to run the full robot. Memory is not implemented yet.
// state is the initial state it starts at, robot is a function
function runRobot(state, robot) {
    // since there's no terminating statement this will run forever unless I break out
    for (let turn = 0;; turn++) {
        // if there are no more parcels
        if (state.parcels.length == 0) {
            console.log(`Finished in ${turn} number of turns.`);
            break;
        }
        // there are still parcels. Robot needs to decide an action.
        let action = robot(state);
        // use state's move method to move to new place and update
        state = state.move(action.direction);
        console.log(`Moved to ${action.direction}`);
    }
}
// Export anything interesting so I can look at it in REPL
exports.roadGraph = roadGraph;
exports.VillageState = VillageState;
exports.runRobot = runRobot;
exports.randomRobot = randomRobot;