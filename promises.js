// Stuff to mess with promises
const fs = require('fs');

function rand() {
    return Math.floor(Math.random() * 10);
}

function badAsync() {
    let p = Promise.resolve('1').then(val => { return val + 5; });
    return p; // this is a Promise<pending>
}

function weirdRead(file, callback) {
    console.log('This is inside weirdRead before file is read');
    return fs.readFile(file, (err, data) => callback(err, data));
}

// Bastardized version of the crow-tech request function from Eloquent JavaScript Chapter 11 using fs.readFile
function crapRead(filename) {
    return new Promise((resolve, reject) => {
        let done = false;
        function attempt(n) {
            fs.readFile(filename, (fail, val) => {
                console.log('Done? - ' + done);
                done = true;
                if (fail) reject(fail);
                else resolve(val);
            });
            // wait a bit before another attempt
            setTimeout(() => {
                if (done) return;
                else if (n < 3) attempt(n+1);
                else reject(new Error('Attempt timed out'));
            }, 1);
        }
        attempt(1);
    });
}

// My own implementation of Promise.all as an exercise
// Not the best implementation, since multiple calls to map() plus the half second delay is very not optimal.
function Promise_all(promises) {
    return new Promise((resolve, reject) => {
      let count = promises.length;
      let result = [];
      if (count == 0) resolve(result);
      function next() {
        promises.map((promise, index) => {
          promise.then(val => {
            count = count - 1;
            result[index] = val;
          })
          .catch(err => { reject(err); });
        });
      setTimeout(() => {
         if (count == 0) resolve(result);
        else {
           next();
        }
      }, 500);
      }
      next();
    });
  }

// <-- Actual execution will begin here -->
console.log("Begin execution");
crapRead('./.gitignore')
    .then(val => console.log('Successful file read'))
    .catch(err => console.log(err));
console.log("After crapRead is called");
console.log(badAsync());
console.log("After badAsync is called");
let crap;
weirdRead('./.gitignore', (err,data) => {
    console.log('This is inside the weirdRead callback');
    crap = data;
    console.log(crap);
})
console.log("After weirdRead is called");
console.log("This is logging the value of crap: " + crap); // this will be undefined since it runs before the callback of weirdRead