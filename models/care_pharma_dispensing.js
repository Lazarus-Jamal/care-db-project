
// models/care_pharma_dispensing.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const m = sequelize.define('care_pharma_dispensing', {
    id:              { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    bill_item_id:    { type: DataTypes.INTEGER,      allowNull: false },
    bill_no:         { type: DataTypes.INTEGER,      allowNull: false },
    encounter_nr:    { type: DataTypes.INTEGER,      allowNull: false },
    facility_id:     { type: DataTypes.INTEGER,      allowNull: true },
    pharmacy_unit_id: { type: DataTypes.INTEGER,     allowNull: true },
    item_id:         { type: DataTypes.BIGINT,       allowNull: false },
    item_number:     { type: DataTypes.STRING(50),   allowNull: false, defaultValue: '' },
    article:         { type: DataTypes.STRING(100),  allowNull: false, defaultValue: '' },
    qty_to_dispense: { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
    qty_dispensed:   { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
    dispensed_by:    { type: DataTypes.STRING(60),   allowNull: false, defaultValue: '' },
    dispensed_at:    { type: DataTypes.DATE,         allowNull: false },
    notes:           { type: DataTypes.TEXT,         allowNull: true },
  }, {
    tableName: 'care_pharma_dispensing',
    timestamps: false,
    indexes: [
      { name: 'idx_dispensing_facility', fields: ['facility_id'] },
      { name: 'idx_dispensing_unit', fields: ['pharmacy_unit_id'] },
    ],
  });
  return m;
};


