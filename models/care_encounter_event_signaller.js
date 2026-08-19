// models/care_encounter_event_signaller.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_event_signaller = sequelize.define('care_encounter_event_signaller', {
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    yellow: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    black: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    blue_pale: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    brown: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    pink: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    yellow_pale: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    red: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_pale: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    violet: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    blue: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    biege: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    orange: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_1: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_2: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_3: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_4: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_5: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_6: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    green_7: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_1: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_2: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_3: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_4: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_5: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_6: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_7: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_8: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_9: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_10: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_11: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_12: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_13: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_14: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_15: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_16: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_17: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_18: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_19: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_20: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_21: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_22: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_23: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    rose_24: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_encounter_event_signaller',
    timestamps: false,
  });

  return care_encounter_event_signaller;
};