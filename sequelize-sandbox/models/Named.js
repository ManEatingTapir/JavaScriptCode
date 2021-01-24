// By specifying sequelize as a parameter, we don't have to create a connection to the database
// in every model file, instead having one overall file that creates the connection
// then passes it to each model as it needs them.
// Defining function that will return the model definition. We essentially just skip the variable declaration.
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Named', {
        // Define model attributes
        // id, name, country_of_origin, story_name, time_active
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            unique: true
        },
        country_of_origin: {
            type: DataTypes.STRING,
            allowNull: false // equal to NOT NULL
        },
        story_name: {
            type: DataTypes.STRING,
            defaultValue: 'None'
        },
        time_active: {
            type: DataTypes.INTEGER,
        }
    }, {
        // Disable timestamps so queries don't include created_At/updated_At columns
        timestamps: false,
        // Explicitly specify table name so Sequelize will honor the existing table
        tableName: 'named'
    });
}