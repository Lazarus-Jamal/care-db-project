// models/care_address_citytown.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_address_citytown = sequelize.define('care_address_citytown', {
    nr: { type: DataTypes.MEDIUMINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    unece_modifier: { type: DataTypes.CHAR(2), allowNull: true },
    unece_locode: { type: DataTypes.STRING(15), allowNull: true },
    name: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    zip_code: { type: DataTypes.STRING(25), allowNull: true },
    iso_country_id: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: '' },
    unece_locode_type: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    unece_coordinates: { type: DataTypes.STRING(25), allowNull: true },
    info_url: { type: DataTypes.STRING(255), allowNull: true },
    use_frequency: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: true },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_address_citytown',
    timestamps: false,
  });

  return care_address_citytown;
};