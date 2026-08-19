
// models/care_pharma_stock_movements.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const m = sequelize.define('care_pharma_stock_movements', {
    id:             { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    item_id:        { type: DataTypes.BIGINT,     allowNull: false },
    pharmacy_unit_id: { type: DataTypes.INTEGER,  allowNull: true },
    item_number:    { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
    movement_type:  { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
    quantity:       { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    qty_before:     { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    qty_after:      { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    reference_type: { type: DataTypes.STRING(30), allowNull: true },
    reference_id:   { type: DataTypes.INTEGER,    allowNull: true },
    performed_by:   { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    performed_at:   { type: DataTypes.DATE,       allowNull: false },
    notes:          { type: DataTypes.TEXT,       allowNull: true },
  }, {
    tableName: 'care_pharma_stock_movements',
    timestamps: false,
    indexes: [
      { name: 'idx_movements_unit', fields: ['pharmacy_unit_id'] },
    ],
  });
  return m;
};


