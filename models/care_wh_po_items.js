// models/care_wh_po_items.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_po_items = sequelize.define('care_wh_po_items', {
    item_id:           { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    po_id:             { type: DataTypes.INTEGER,       allowNull: false },
    product_id:        { type: DataTypes.INTEGER,       allowNull: false },
    quantity_ordered:  { type: DataTypes.INTEGER,       allowNull: false, defaultValue: 0 },
    quantity_received: { type: DataTypes.INTEGER,       allowNull: false, defaultValue: 0 },
    unit_price:        { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0.00 },
    total_price:       { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0.00 },
    status:            { type: DataTypes.STRING(20),    allowNull: false, defaultValue: 'pending' },
    notes:             { type: DataTypes.TEXT,          allowNull: true },
  }, { tableName: 'care_wh_po_items', timestamps: false });
  care_wh_po_items.associate = (models) => {
    care_wh_po_items.belongsTo(models.care_wh_purchase_orders, { foreignKey: 'po_id', as: 'po' });
    care_wh_po_items.belongsTo(models.care_wh_products, { foreignKey: 'product_id', as: 'product' });
    care_wh_po_items.hasMany(models.care_wh_delivery_items, { foreignKey: 'po_item_id', as: 'deliveryItems' });
  };
  return care_wh_po_items;
};
