
// models/care_pharmacy_stock.js
// Pharmacy Scoping — the actual per-unit stock ledger. care_drugsandservices
// stays the global catalog (same item_id everywhere, for cross-facility
// statistics); this table is what dispensing, manual adjustments, and
// inventory counts actually read/write. One row per (pharmacy_unit_id,
// item_id) -- a unit "carries" a drug simply by having a row here, not
// by the drug existing in the catalog.
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_pharmacy_stock = sequelize.define('care_pharmacy_stock', {
    id:               { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    pharmacy_unit_id: { type: DataTypes.INTEGER,         allowNull: false },
    item_id:          { type: DataTypes.BIGINT,          allowNull: false },
    quantity:         { type: DataTypes.INTEGER,         allowNull: false, defaultValue: 0 },
    reorder_level:    { type: DataTypes.INTEGER,         allowNull: false, defaultValue: 0 },
    minimum_level:    { type: DataTypes.INTEGER,         allowNull: false, defaultValue: 0 },
    maximum_level:    { type: DataTypes.INTEGER,         allowNull: false, defaultValue: 0 },
    shelf_id:         { type: DataTypes.INTEGER,         allowNull: true },
    is_active:        { type: DataTypes.TINYINT,         allowNull: false, defaultValue: 1 },
    created_at:       { type: DataTypes.DATE,            allowNull: false, defaultValue: DataTypes.NOW },
    updated_at:       { type: DataTypes.DATE,            allowNull: true },
  }, {
    tableName: 'care_pharmacy_stock',
    timestamps: false,
    indexes: [
      { name: 'uniq_unit_item', unique: true, fields: ['pharmacy_unit_id', 'item_id'] },
      { name: 'idx_pharmacy_stock_unit', fields: ['pharmacy_unit_id'] },
      { name: 'idx_pharmacy_stock_item', fields: ['item_id'] },
    ],
  });

  care_pharmacy_stock.associate = (models) => {
    care_pharmacy_stock.belongsTo(models.care_pharmacy_unit, {
      foreignKey: 'pharmacy_unit_id', as: 'unit', constraints: false,
    });
    care_pharmacy_stock.belongsTo(models.care_drugsandservices, {
      foreignKey: 'item_id', as: 'drug', constraints: false,
    });
    care_pharmacy_stock.belongsTo(models.care_pharmacy_shelf, {
      foreignKey: 'shelf_id', as: 'shelf', constraints: false,
    });
  };
  return care_pharmacy_stock;
};
