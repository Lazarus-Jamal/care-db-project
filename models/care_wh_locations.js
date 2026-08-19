// models/care_wh_locations.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_locations = sequelize.define('care_wh_locations', {
    location_id: { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    parent_id:   { type: DataTypes.INTEGER,     allowNull: true },
    aisle:       { type: DataTypes.STRING(10),  allowNull: false, defaultValue: '' },
    shelf:       { type: DataTypes.STRING(10),  allowNull: false, defaultValue: '' },
    label:       { type: DataTypes.STRING(30),  allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(255), allowNull: true },
    is_active:   { type: DataTypes.TINYINT,     allowNull: false, defaultValue: 1 },
  }, { tableName: 'care_wh_locations', timestamps: false });
  care_wh_locations.associate = (models) => {
    care_wh_locations.hasMany(models.care_wh_stock, { foreignKey: 'location_id', as: 'stock' });
  };
  return care_wh_locations;
};


