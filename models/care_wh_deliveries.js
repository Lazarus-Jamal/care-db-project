// models/care_wh_deliveries.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_deliveries = sequelize.define('care_wh_deliveries', {
    delivery_id:  { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    po_id:        { type: DataTypes.INTEGER,     allowNull: false },
    delivery_ref: { type: DataTypes.STRING(50),  allowNull: true },
    delivered_by: { type: DataTypes.STRING(100), allowNull: true },
    received_by:  { type: DataTypes.STRING(60),  allowNull: false, defaultValue: '' },
    received_at:  { type: DataTypes.DATE,        allowNull: false },
    status:       { type: DataTypes.STRING(25),  allowNull: false, defaultValue: 'pending_qc' },
    notes:        { type: DataTypes.TEXT,        allowNull: true },
  }, { tableName: 'care_wh_deliveries', timestamps: false });

  care_wh_deliveries.associate = (models) => {
    care_wh_deliveries.belongsTo(models.care_wh_purchase_orders,
      { foreignKey: 'po_id', as: 'po' });
    care_wh_deliveries.hasMany(models.care_wh_delivery_items,
      { foreignKey: 'delivery_id', as: 'items' });
  };

  return care_wh_deliveries;
};
