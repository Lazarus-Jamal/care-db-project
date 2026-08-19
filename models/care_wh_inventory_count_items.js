// models/care_wh_inventory_count_items.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_inventory_count_items = sequelize.define('care_wh_inventory_count_items', {
    id:                 { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    count_id:           { type: DataTypes.INTEGER,    allowNull: false },
    product_id:         { type: DataTypes.INTEGER,    allowNull: false },
    location_id:        { type: DataTypes.INTEGER,    allowNull: true },
    batch_number:       { type: DataTypes.STRING(100),allowNull: true },
    system_qty:         { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    counted_qty:        { type: DataTypes.INTEGER,    allowNull: true },
    // variance is a generated column in MySQL — expose as virtual here
    variance_reason:    { type: DataTypes.TEXT,       allowNull: true },
    counted_by:         { type: DataTypes.STRING(60), allowNull: true },
    counted_at:         { type: DataTypes.DATE,       allowNull: true },
    adjustment_applied: { type: DataTypes.TINYINT,    allowNull: false, defaultValue: 0 },
  }, { tableName: 'care_wh_inventory_count_items', timestamps: false });

  care_wh_inventory_count_items.associate = (models) => {
    care_wh_inventory_count_items.belongsTo(models.care_wh_inventory_counts,
      { foreignKey: 'count_id',   as: 'countSession' });
    care_wh_inventory_count_items.belongsTo(models.care_wh_products,
      { foreignKey: 'product_id', as: 'product' });
    care_wh_inventory_count_items.belongsTo(models.care_wh_locations,
      { foreignKey: 'location_id', as: 'location', constraints: false });
  };
  return care_wh_inventory_count_items;
};
