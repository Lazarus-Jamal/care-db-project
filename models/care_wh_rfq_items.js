// models/care_wh_rfq_items.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_rfq_items = sequelize.define('care_wh_rfq_items', {
    id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rfq_id:              { type: DataTypes.INTEGER, allowNull: false },
    product_id:          { type: DataTypes.INTEGER, allowNull: false },
    quantity_requested:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    notes:               { type: DataTypes.TEXT,    allowNull: true },
  }, { tableName: 'care_wh_rfq_items', timestamps: false });

  care_wh_rfq_items.associate = (models) => {
    care_wh_rfq_items.belongsTo(models.care_wh_rfq,      { foreignKey: 'rfq_id',     as: 'rfq' });
    care_wh_rfq_items.belongsTo(models.care_wh_products, { foreignKey: 'product_id', as: 'product' });
  };
  return care_wh_rfq_items;
};
