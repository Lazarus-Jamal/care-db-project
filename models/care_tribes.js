// models/care_tribes.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_tribes = sequelize.define('care_tribes', {
    tribe_id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    tribe_code: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: '',
    },
    tribe_name: {
      type:         DataTypes.STRING(60),
      allowNull:    false,
      defaultValue: '',
    },
    is_additional: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
    },
  }, {
    tableName:  'care_tribes',
    timestamps: false,
  });

  return care_tribes;
};
