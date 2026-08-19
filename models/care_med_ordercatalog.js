// models/care_med_ordercatalog.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_med_ordercatalog = sequelize.define('care_med_ordercatalog', {
    item_no: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    dept_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    store_type: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'warehouse' },
    hit: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    artikelname: { type: DataTypes.TEXT, allowNull: false },
    bestellnum: { type: DataTypes.STRING(20), allowNull: false },
    minorder: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    maxorder: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    proorder: { type: DataTypes.TEXT, allowNull: false },
    dose: { type: DataTypes.TEXT, allowNull: true },
    packing: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName:  'care_med_ordercatalog',
    timestamps: false,
  });

  return care_med_ordercatalog;
};