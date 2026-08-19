
// models/care_pharma_inventory_count_items.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_pharma_inventory_count_items = sequelize.define('care_pharma_inventory_count_items', {
    id:                 { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    count_id:           { type: DataTypes.INTEGER,    allowNull: false },
    item_id:            { type: DataTypes.INTEGER,    allowNull: false },
    system_qty:         { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    counted_qty:        { type: DataTypes.INTEGER,    allowNull: true },
    // variance is a MySQL GENERATED column (counted_qty - system_qty) — same
    // pattern as care_wh_inventory_count_items. Deliberately NOT declared here;
    // the controller always computes counted_qty - system_qty inline instead,
    // matching how inventoryCountController.js (warehouse) does it.
    variance_reason:    { type: DataTypes.TEXT,       allowNull: true },
    counted_by:         { type: DataTypes.STRING(60), allowNull: true },
    counted_at:         { type: DataTypes.DATE,       allowNull: true },
    adjustment_applied: { type: DataTypes.TINYINT,    allowNull: false, defaultValue: 0 },
  }, { tableName: 'care_pharma_inventory_count_items', timestamps: false });

  care_pharma_inventory_count_items.associate = (models) => {
    care_pharma_inventory_count_items.belongsTo(models.care_pharma_inventory_counts,
      { foreignKey: 'count_id', as: 'countSession' });
    care_pharma_inventory_count_items.belongsTo(models.care_drugsandservices,
      { foreignKey: 'item_id', targetKey: 'item_id', as: 'drug' });
  };
  return care_pharma_inventory_count_items;
};
