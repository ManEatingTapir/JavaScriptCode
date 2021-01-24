module.exports = function getName() {
    return 'Jim';
}
module.exports = function getAge() {
    return 15;
}
// only the function getAge() will be applied to module.exports, the first is overwritten
console.log(module);