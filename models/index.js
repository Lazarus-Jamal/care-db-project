// models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const path = require('path');
const fs = require('fs');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Dynamically load all model files in this directory
const modelDir = __dirname;
fs.readdirSync(modelDir)
  .filter(file => (file.indexOf('.') !== 0) && (file !== path.basename(__filename)) && (file.slice(-3) === '.js'))
  .forEach(file => {
    const model = require(path.join(modelDir, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Call associate() on all models that define it
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;