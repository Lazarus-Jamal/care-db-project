// models/care_med_products_main.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_med_products_main = sequelize.define('care_med_products_main', {
    bestellnum: { type: DataTypes.STRING(25), primaryKey: true },
    artikelnum: { type: DataTypes.TEXT, allowNull: false },
    industrynum: { type: DataTypes.TEXT, allowNull: false },
    artikelname: { type: DataTypes.TEXT, allowNull: false },
    generic: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    packing: { type: DataTypes.TEXT, allowNull: false },
    dose: { type: DataTypes.TEXT, allowNull: true },
    minorder: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    maxorder: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    proorder: { type: DataTypes.TEXT, allowNull: false },
    picfile: { type: DataTypes.TEXT, allowNull: false },
    encoder: { type: DataTypes.TEXT, allowNull: false },
    enc_date: { type: DataTypes.TEXT, allowNull: false },
    enc_time: { type: DataTypes.TEXT, allowNull: false },
    lock_flag: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    medgroup: { type: DataTypes.TEXT, allowNull: false },
    cave: { type: DataTypes.TEXT, allowNull: false },
    store_type: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'warehouse' },
    status: { type: DataTypes.STRING(20), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
    depot: { type: DataTypes.TEXT, allowNull: true },
    minpcs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_med_products_main',
    timestamps: false,
  });

  return care_med_products_main;
};