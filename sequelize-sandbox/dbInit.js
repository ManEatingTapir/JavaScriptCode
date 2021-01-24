const  { Sequelize, DataTypes } = require('sequelize');

// Create database connection
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './pgte.db'
})

// Pull named, tapir, and user models
const Named = require('./models/Named')(sequelize, DataTypes);
const Tapirs = require('./models/Tapirs')(sequelize, DataTypes);
const Users = require('./models/Users')(sequelize, DataTypes);

// console.log(module);
async function test_connection() {
    try {
        await sequelize.authenticate();
        console.log('Connection successfully established.');
    }
    catch (error) {
        console.error('Unable to connect to database:', error);
    }
}

async function print_all(database) {
    try {
        database.findAll()
        .then((value) => {
            // console.log(value);
            // map is used to make sure the previous data values and other sequelize properties
            // aren't printed, only the columns in the table.
            console.log(value.map(row => row.dataValues));
        });
    }
    catch (error) {
        console.error('Something went fucky:', error);
    }
}

async function print_tapir(Tapirs, tapir_name) {
    try {
        Tapirs.findOne({
            where: {
                name: tapir_name
            }
        })
        .then((value) => {
            console.log(value.dataValues);
        });
    }
    catch (error) {
        console.error('Something went fucky:', error);
    }
}

// test_connection();
// print_all(Named);
// print_all(Tapirs);
// print_all(Users);
print_tapir(Tapirs, 'Tapirus Primus');