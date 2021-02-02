// stuff to mess with promises
const fs = require('fs');

function rand() {
    return Math.floor(Math.random() * 10);
}
// let p = Promise.resolve(1)
// p.then(value => console.log(`Got ${value}`));

// let p1 = new Promise((resolve, reject) => {
//     let flag = rand();
//     if (flag < 5) {
//         resolve('Rolled low');
//     }
//     else {
//         reject('Rolled too high');
//     }
// })
// p1.then(val => {
//     console.log(val);
// }).catch(err => {
//     console.log(err);
// })

// // output of the following block will be second, then first
// fs.readFile('./.gitignore', (err, data) => {
//     if (err) throw err;
//     console.log('first');
// });
// console.log('second');

// Bastardized version of the crow-tech request function from Eloquent JavaScript Chapter 11
function shitRead(filename) {
    return new Promise((resolve, reject) => {
        let done = (rand() < 5) ? true : false;
        function attempt(n) {
            fs.readFile(filename, (fail, val) => {
                console.log('attempt ' + done);
                done = (rand() < 5) ? true : false;
                if (fail) reject(fail);
                else resolve(val);
            });
            // wait a bit before another attempt
            setTimeout(() => {
                if (done) return;
                else if (n < 3) attempt(n+1);
                else reject(new Error('fuck'));
            }, 250);
        }
        attempt(1);
    });
}
shitRead('./.gitignore')
    .then(val => console.log('thing'))
    .catch(err => console.log('error'));