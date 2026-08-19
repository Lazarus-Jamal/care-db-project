const { Sequelize } = require('sequelize');
require('dotenv').config();

// WAT = West Africa Time = UTC+1
// timezone: '+01:00' tells Sequelize to offset all datetime values by WAT.
// dialectOptions.typeCast handles how mysql2 reads DATETIME columns back —
// returning them as strings lets Sequelize apply the timezone offset correctly.
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:     process.env.DB_HOST,
    dialect:  'mysql',
    logging:  false,
    timezone: '+01:00',
    dialectOptions: {
      typeCast: function (field, next) {
        if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
          return field.string();
        }
        return next();
      },
    },
  }
);

module.exports = sequelize;
