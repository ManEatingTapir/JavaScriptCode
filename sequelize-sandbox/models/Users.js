module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Users', {
        // Define model attributes
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        currency: {
            type: DataTypes.INTEGER,
            defaultValue: 50
        }
    }, {
        timestamps: false,
        // Explicitly specify table name so Sequelize will honor the existing table
        tableName: 'users'
    });
}