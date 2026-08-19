
// models/care_pharmacy_shelf.js
// Pharmacy Scoping — reference list of aisle/shelf names, scoped per
// pharmacy unit (not per facility) -- day and night units at the same
// facility are genuinely separate physical locations, so their shelves
// are separate lists too.
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_pharmacy_shelf = sequelize.define('care_pharmacy_shelf', {
    id:               { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    pharmacy_unit_id: { type: DataTypes.INTEGER,       allowNull: false },
    label:            { type: DataTypes.STRING(50),   allowNull: false }, // e.g. "Aisle A", "Fridge 1"
    is_active:        { type: DataTypes.TINYINT,       allowNull: false, defaultValue: 1 },
    created_at:       { type: DataTypes.DATE,          allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'care_pharmacy_shelf',
    timestamps: false,
    indexes: [
      { name: 'idx_pharmacy_shelf_unit', fields: ['pharmacy_unit_id'] },
      { name: 'uniq_unit_label', unique: true, fields: ['pharmacy_unit_id', 'label'] },
    ],
  });

  care_pharmacy_shelf.associate = (models) => {
    care_pharmacy_shelf.belongsTo(models.care_pharmacy_unit, {
      foreignKey: 'pharmacy_unit_id', as: 'unit', constraints: false,
    });
  };
  return care_pharmacy_shelf;
};
