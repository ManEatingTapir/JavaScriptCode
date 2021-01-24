module.exports = (sequelize, DataTypes) => {
    const Tapirs = sequelize.define('Tapirs', {
        // Define model attributes
        // owner_id, name, head, body, front_leg, back_leg
        owner_id: {
            type: DataTypes.INTEGER,
        },
        name: {
            type: DataTypes.STRING,
            unique: true
        },
        head: {
            type: DataTypes.STRING,
            defaultValue: 'Black'
        },
        body: {
            type: DataTypes.STRING,
            defaultValue: 'Black'
        },
        front_leg: {
            type: DataTypes.STRING,
            defaultValue: 'Black'
        },
        back_leg: {
            type: DataTypes.STRING,
            defaultValue: 'Black'
        }
    }, {
        timestamps: false,
        // Explicitly specify table name so Sequelize will honor the existing table
        tableName: 'tapirs'
    });
    // Sequelize will auto assume a primary key 'id' column exists
    // This is to remove that
    Tapirs.removeAttribute('id');
    return Tapirs;
}